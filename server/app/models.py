from django.db import models
from django.core.validators import MaxLengthValidator
from django.utils import timezone

class Article(models.Model):

    class Meta:
        constraints = [
            # Have to enforce manually that no article_id equals the title of some
            # (possibly other) article
            models.UniqueConstraint(fields=["article_id"], name="unique_article_id"),
            models.UniqueConstraint(fields=["title"], name="unique_title"),
        ]

    article_id = models.CharField(max_length=255, null=True, blank=True)
    title = models.CharField(max_length=255)
    text = models.TextField(blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
