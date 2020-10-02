# The Domain

This directory contains the client-side scripts associated to the Domain Model
according to Domain Driven Design (DDD).

Because the Domain is not client- or server-specific, its code should be
mirrored in `server/app/domain` in Python.

At least until I have a robust solution for transpiling or some Meta language
at my disposal. An isomorphic Client-Server architecture would not have
this issue but I have decided against it because of the inevitable lock-in effect.
