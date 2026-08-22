from controllers.generation_controller import GenerationController
from controllers.search_controller import SearchController
from core.evaluate_retrieval import load_eval_set, precision_at_k
from helpers.logger import get_logger

logger = get_logger("evaluate_generation")


def run_benchmark(top_k: int = 5) -> dict:
    eval_set = load_eval_set()
    gen_controller = GenerationController()
    search_controller = SearchController()

    total_citations = 0
    correct_citations = 0
    total_claims = 0
    unsupported_count = 0
    p5_scores = []
    details = []
    generation_failures = []

    for item in eval_set:
        question = item["question"]
        relevant_ids = {a["chunk_id"] for a in item.get("expected_answers", [])}

        retrieved = search_controller.search(question, top_k=top_k)
        retrieved_ids = [r["chunk_id"] for r in retrieved]
        p5 = precision_at_k(retrieved_ids, relevant_ids, top_k)
        p5_scores.append(p5)

        try:
            result = gen_controller.answer(question, top_k=top_k)
        except Exception as e:
        
            logger.error(f"Generation failed for {question!r}: {e}")
            generation_failures.append({"question": question, "error": str(e)})
            details.append({
                "question": question,
                "precision_at_5": round(p5, 3),
                "citations_checked": 0,
                "citations_correct": 0,
                "claims_generated": 0,
                "claims_unsupported": 0,
                "generation_failed": True,
            })
            continue

        citations = result.get("citations", [])
        q_correct = sum(1 for c in citations if c["chunk_id"] in relevant_ids)
        total_citations += len(citations)
        correct_citations += q_correct

        evidence = result.get("supporting_evidence", [])
        unsupported = result.get("unsupported_claims", [])
        total_claims += len(evidence)
        unsupported_count += len(unsupported)

        details.append({
            "question": question,
            "precision_at_5": round(p5, 3),
            "citations_checked": len(citations),
            "citations_correct": q_correct,
            "claims_generated": len(evidence),
            "claims_unsupported": len(unsupported),
            "generation_failed": False,
        })

    avg_p5 = sum(p5_scores) / len(p5_scores) if p5_scores else 0.0
    citation_accuracy = (correct_citations / total_citations) if total_citations else 0.0

    if total_claims == 0:
       
        faithfulness = None
        logger.warning(
            "total_claims == 0 across the whole eval set -- faithfulness is "
            "undefined, not 1.0. Check generation_failures / whether the "
            "generation pipeline is actually running."
        )
    else:
        faithfulness = 1 - unsupported_count / total_claims

    return {
        "retrieval_precision_at_5": round(avg_p5, 3),
        "citation_accuracy": round(citation_accuracy, 3),
        "faithfulness": round(faithfulness, 3) if faithfulness is not None else None,
        "questions_evaluated": len(eval_set),
        "questions_failed": len(generation_failures),
        "generation_failures": generation_failures,
        "details": details,
    }


def main():
    result = run_benchmark()

    print(f"Evaluated {result['questions_evaluated']} questions "
          f"({result['questions_failed']} generation failure(s))\n" + "-" * 60)
    for d in result["details"]:
        if d.get("generation_failed"):
            print(f"[FAILED] generation error | P@5={d['precision_at_5']:.2f} | {d['question'][:55]}")
            continue
        status = "" if d["claims_unsupported"] == 0 and d["precision_at_5"] > 0 else "[WARN]"
        print(f"{status} P@5={d['precision_at_5']:.2f} | "
              f"citations {d['citations_correct']}/{d['citations_checked']} | "
              f"unsupported {d['claims_unsupported']}/{d['claims_generated']} | "
              f"{d['question'][:55]}")

    print("-" * 60)
    print(f"\n Retrieval Precision@5 : {result['retrieval_precision_at_5']}")
    print(f" Citation accuracy         : {result['citation_accuracy']}")
    faithfulness_display = (
        result["faithfulness"] if result["faithfulness"] is not None
        else "N/A (no claims generated -- see generation_failures)"
    )
    print(f" (Faithfulness) : {faithfulness_display}")

    if result["generation_failures"]:
        print(f"\n{len(result['generation_failures'])} generation failure(s):")
        for f in result["generation_failures"]:
            print(f"  - {f['question'][:70]}\n    {f['error']}")


if __name__ == "__main__":
    main()