def crosscutt_permissions(username, namespace):

    if namespace == "paul" and username == "paul":
        return "full"

    if namespace == "paul-ro":
        return "full" if username == "paul" else "readonly"

    if namespace == "public":
        return "full" if username == "paul" else "readonly"

    return "none"
