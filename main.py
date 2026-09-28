from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1.routes import router

app = FastAPI(title="SIH26191 - Hazard Red Zone Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"https://.*\.(vercel\.app|netlify\.app)",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"status": "running", "docs": "/docs"}