from django.shortcuts import render
from django.http import JsonResponse
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from .models import Article as DbArticle
from .permissions import crosscutt_permissions
from .domain.locator import LocatorSerializationService
from .domain.article import Article, ArticleSerializationService

class ArticleIntegrityException(Exception):
    pass

def get_previews(request):
    return JsonResponse(getPreviewsJson(request.user))

def get_article(request):
    locator = LocatorSerializationService.deserialize(request.GET["locator"])

    name = locator.getName()
    namespace = locator.getNamespace()
    permissions = get_permissions(request.user, namespace)

    if permissions != "full" and permissions != "readonly":
        return JsonResponse({
            "success": False,
            "reason": "forbidden",
        })

    queryset = DbArticle.objects.filter(filter_by_locator(locator))
    if queryset.exists():
        article = queryset.get()
        return JsonResponse(serialize_article_and_permissions(article, permissions))
    else:
        return JsonResponse({
            "success": False,
            "permissions": permissions,
            "reason": "not found",
        })

def filter_by_locator(locator):
    return Q(namespace=locator.getNamespace()) & (Q(article_id=locator.getName()) | Q(title=locator.getName()))

def serialize_article_and_permissions(db_article, permissions):
    return {
        "success": True,
        "article": ArticleSerializationService.serialize(Article({
            "namespace": db_article.namespace,
            "id": db_article.article_id,
            "title": db_article.title,
            "text": db_article.text,
        }, permissions))
    }

def create_article(request):
    id = parseId(request.GET["id"])
    title = request.GET["title"]
    text = request.GET["text"]
    namespace = request.GET["namespace"]
    permissions = get_permissions(request.user, namespace)

    if permissions != "full":
        return JsonResponse({
            "success": False,
            "reason": "forbidden",
        })

    try:
        with transaction.atomic():
            article = DbArticle(article_id=id, title=title, text=text, namespace=namespace)
            article.full_clean()
            article.save()
            validateUnique(namespace, id)
            validateUnique(namespace, title)
    except ArticleIntegrityException:
        return JsonResponse({
            "success": False,
            "reason": "ID or title are already taken.",
        })

    return JsonResponse(serialize_article_and_permissions(article, permissions))

def change_article(request):
    locator = LocatorSerializationService.deserialize(request.GET["locator"])
    new_namespace = request.GET["new_namespace"]
    new_id = parseId(request.GET["new_id"])
    new_title = request.GET["new_title"]
    new_text = request.GET["new_text"]
    permissions = get_permissions(request.user, locator.getNamespace())

    if permissions != "full":
        return JsonResponse({
            "success": False,
            "reason": "forbidden",
        })


    article = None
    try:
        with transaction.atomic():
            article = DbArticle.objects.get(filter_by_locator(locator))
            article.namespace = new_namespace
            article.article_id = new_id
            article.title = new_title
            article.text = new_text
            article.full_clean()
            article.save()
            validateUnique(new_namespace, new_id)
            validateUnique(new_namespace, new_title)
    except ArticleIntegrityException:
        return JsonResponse({
            "success": False,
            "message": "ID or title are already taken.",
        })

    return JsonResponse(serialize_article_and_permissions(article, permissions))

def error_json_response(message):
    return JsonResponse({ "error": message })

def getPreviewsJson(user):
    return {
        "previews": [
            { "namespace": article.namespace, "id": article.article_id, "title": article.title, "preview": article.text[:200] }
            for article in DbArticle.objects.all()
            if get_permissions(user, article.namespace) in ["full", "readonly"]
        ]
    }

def validateUnique(namespace, name):
    if name is None:
        return

    if DbArticle.objects.filter(Q(namespace=namespace, article_id=name) | Q(namespace=namespace, title=name)).count() > 1:
        raise ArticleIntegrityException("name " + name + " is not unique")

def parseId(string):
    if len(string) == 0:
        return None
    else:
        return string

def get_permissions(user, namespace):
    username = user.username if user.is_authenticated else None
    return crosscutt_permissions(username, namespace)
