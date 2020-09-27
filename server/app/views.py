from django.shortcuts import render
from django.http import JsonResponse
from .models import Article

def get_previews(request):
    return JsonResponse(getPreviewsJson())

def get_article(request):
    title = request.GET["title"]
    article = Article.objects.get(title=title)
    return JsonResponse({
        "title": article.title,
        "text": article.text,
    })

def create_article(request):
    title = request.GET["title"]
    text = request.GET["text"]

    if Article.objects.filter(title=title).exists():
        return error_json_response("Article with this title already exists")

    article = Article(title=title, text=text)
    article.full_clean()
    article.save()

def error_json_response(message):
    return JsonResponse({ "error": message })

def getPreviewsJson():
    return {
        "previews": [
            { "title": article.title, "preview": article.text[:200] }
            for article in Article.objects.all()
        ]
    }
