from django.shortcuts import render
from django.http import JsonResponse
from .models import Article

def get_previews(request):
    return JsonResponse(getPreviewsJson())

def get_article(request):
    id = request.GET["id"]
    article = Article.objects.get(article_id=id)
    return JsonResponse({
        "id": article.article_id,
        "title": article.title,
        "text": article.text,
    })

def create_article(request):
    id = request.GET["id"]
    title = request.GET["title"]
    text = request.GET["text"]

    if Article.objects.filter(article_id=id).exists():
        return error_json_response("Article with this ID already exists")

    article = Article(article_id=id, title=title, text=text)
    article.full_clean()
    article.save()

def change_article(request):
    id = request.GET["id"]
    new_id = request.GET["new_id"]
    new_title = request.GET["new_title"]
    new_text = request.GET["new_text"]

    if not Article.objects.filter(article_id=id).exists():
        return error_json_response("Article with this ID does not exist")

    Article.objects.filter(article_id=id).update(
        article_id=new_id,
        title=new_title,
        text=new_text)

    return JsonResponse({"success": True})

def error_json_response(message):
    return JsonResponse({ "error": message })

def getPreviewsJson():
    return {
        "previews": [
            { "id": article.article_id, "title": article.title, "preview": article.text[:200] }
            for article in Article.objects.all()
        ]
    }
