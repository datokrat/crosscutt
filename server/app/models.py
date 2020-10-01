from django.db import models
from django.core.validators import MaxLengthValidator

class Article(models.Model):

    class Meta:
        constraints = [
            # Have to enforce manually that no article_id equals the title of some
            # (possibly other) article
            models.UniqueConstraint(fields=["article_id"], name="unique_article_id"),
            models.UniqueConstraint(fields=["title"], name="unique_title"),
        ]

    article_id = models.CharField(max_length=255, null=True)
    title = models.CharField(max_length=255)
    text = models.TextField()
