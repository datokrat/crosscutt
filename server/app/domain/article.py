from .locator import Locator
import json

class Article:
    def __init__(self, data, permissions):
        self.data = {
            "namespace": data["namespace"],
            "id": data["id"],
            "title": data["title"],
            "text": data["text"],
        }
        self.permissions = permissions

    def getData(self):
        self.ensureIsReadable()
        return self.data

    def getTitleBasedLocator(self):
        self.ensureIsReadable()
        return Locator(self.data["namespace"], self.data["title"])

    def isReadOnly(self):
        return self.permissions == "readonly"

    def isReadable(self):
        return self.permissions in ["full", "readonly"]

    def isReadableAndWritable(self):
        return self.permissions == "full"

    def ensureIsReadable(self):
        if not self.isReadable():
            raise ForbiddenOperationException()

class ForbiddenOperationException(Exception):
    pass

class ArticleSerializationService:

    @staticmethod
    def serialize(article):
        data = article.getData()
        return json.dumps({
            "data": data,
            "permissions": article.permissions,
        })

    @staticmethod
    def deserialize(string):
        parsed = json.loads(string)
        return Article(parsed["data"], parsed["permissions"])

