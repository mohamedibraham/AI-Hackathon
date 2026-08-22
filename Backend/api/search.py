from fastapi import APIRouter

from controllers.search_controller import SearchController
from schemas.schemas_search import SearchRequest, SearchResponse

search_router = APIRouter(tags=["Search"])


@search_router.post("/search", response_model=SearchResponse)
def search(payload: SearchRequest):

    results = SearchController().search(payload.query, top_k=payload.top_k)
    return {"query": payload.query, "results": results}