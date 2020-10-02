class Locator:
    def __init__(self, namespace, name):
        self.namespace = namespace
        self.name = name

    def getNamespace(self):
        return self.namespace

    def getName(self):
        return self.name

class LocatorSerializationService:
    @staticmethod
    def serialize(locator):
        return locator.namespace + "/" + locator.name

    @staticmethod
    def deserialize(string):
        slashIndex = string.find("/")
        if slashIndex != -1:
            namespace = string[0:slashIndex]
            name = string[slashIndex+1:]
            return Locator(namespace, name)
        else:
            raise DeserializationException("Error deserializing " + string)

class DeserializationException(Exception):
    pass
