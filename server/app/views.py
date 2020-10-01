from django.shortcuts import render
from django.http import JsonResponse
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from .models import Article

class ArticleIntegrityException(Exception):
    pass

def get_previews(request):
    return JsonResponse(getPreviewsJson())

def get_article(request):
    name = request.GET["name"]
    print(name)
    queryset = Article.objects.filter(Q(article_id=name) | Q(title=name))
    if queryset.exists():
        article = queryset.get()
        return JsonResponse({
            "success": True,
            "id": article.article_id,
            "title": article.title,
            "text": article.text,
        })
    else:
        return JsonResponse({
            "success": False,
        })

def create_article(request):
    id = parseId(request.GET["id"])
    title = request.GET["title"]
    text = request.GET["text"]

    try:
        with transaction.atomic():
            article = Article(article_id=id, title=title, text=text)
            article.full_clean()
            article.save()
            validateUnique(id)
            validateUnique(title)
    except ArticleIntegrityException:
        return JsonResponse({
            "success": False,
            "message": "ID or title are already taken.",
        })

    return JsonResponse({
        "success": True,
    })

def change_article(request):
    title = request.GET["title"]
    new_id = parseId(request.GET["new_id"])
    new_title = request.GET["new_title"]
    new_text = request.GET["new_text"]

    if not Article.objects.filter(title=title).exists():
        return error_json_response("Article with this ID does not exist")

    try:
        with transaction.atomic():
            Article.objects.filter(title=title).update(
                article_id=new_id,
                title=new_title,
                text=new_text,
                last_modified_at=timezone.now())
            validateUnique(new_id)
            validateUnique(new_title)
    except ArticleIntegrityException:
        return JsonResponse({
            "success": False,
            "message": "ID or title are already taken.",
        })

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

def validateUnique(name):
    if name is None:
        return

    if Article.objects.filter(Q(article_id=name) | Q(title=name)).count() > 1:
        raise ArticleIntegrityException("name " + name + " is not unique")

def parseId(string):
    if len(string) == 0:
        return None
    else:
        return string
