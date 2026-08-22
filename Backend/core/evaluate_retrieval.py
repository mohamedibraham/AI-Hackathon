import argparse
import json

from helpers.config import get_settings
from controllers.search_controller import SearchController

settings = get_settings()
EVAL_FILE = settings.DATA_DIR / "eval_questions.json"


def load_eval_set() -> list:
    if not EVAL_FILE.exists():
        raise FileNotFoundError( )
    with open(EVAL_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def precision_at_k(retrieved_ids: list, relevant_ids: set, k: int) -> float:
    top_k_ids = retrieved_ids[:k]
    if not top_k_ids:
        return 0.0
    hits = sum(1 for cid in top_k_ids if cid in relevant_ids)
    return hits / len(top_k_ids)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--top_k", type=int, default=5)
    args = parser.parse_args()

    eval_set = load_eval_set()
    controller = SearchController()

    scores_3 = []
    scores_5 = []
    failures = []

    print(f"Running evaluation on {len(eval_set)} questions...\n" + "-" * 60)

    for item in eval_set:
        question = item["question"]
        relevant_ids = set(item["relevant_chunk_ids"])

        results = controller.search(question, top_k=max(10, args.top_k))
        retrieved_ids = [r["chunk_id"] for r in results]

        p3 = precision_at_k(retrieved_ids, relevant_ids, 3)
        p5 = precision_at_k(retrieved_ids, relevant_ids, 5)
        scores_3.append(p3)
        scores_5.append(p5)

        status = "successful" if p5 > 0 else "failure"
        print(f"{status} P@3={p3:.2f} P@5={p5:.2f} | {question[:70]}")

        if p5 == 0:
            failures.append({
                "question": question,
                "expected": list(relevant_ids),
                "got_top5": retrieved_ids[:5],
            })

    avg_p3 = sum(scores_3) / len(scores_3) if scores_3 else 0
    avg_p5 = sum(scores_5) / len(scores_5) if scores_5 else 0

    print("-" * 60)
    print(f"\nPrecision@3: {avg_p3:.3f}")
    print(f"Precision@5: {avg_p5:.3f}")
    print(f"(P@5=0): {len(failures)}/{len(eval_set)}")

    if failures:
        for f in failures:
            print(f"  - {f['question'][:80]}")
            print(f"  {f['expected']}")
            print(f"   {f['got_top5']}")


if __name__ == "__main__":
    main()