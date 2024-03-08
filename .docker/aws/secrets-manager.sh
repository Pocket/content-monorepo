#!/bin/bash
set -x

SECRET_NAME='CorpusSchedulerLambda/Dev/JWT_KEY'
SECRET_VALUE='{
    "p": "3_aMYuWK8Tt2PMwhBVpDYN6xY71zHXikhV5DTcATP0Y7VQB9EqjgRxatn0SN5wb5AHLZdRVH3m59vcYDa0B1R7tbFNtJWGt7VioBHDp-spvqhvHYpsPdmgH1zR9zN7fUoRvuQAsS29vmzizFLFvtT3kSTd8IytsmpyfaQpnYSJs",
    "kty": "RSA",
    "q": "yhxh_lZznbVfguV-dipyUrALeQYRfwevGfDRZdqxkZrCXnAc-kNb2pBky_tDCRXrpFT8bW-ZwgLg7O66zI1YF-Uh34ORPpwNOyAGf1NXFkeQoOWAQdnqjIhMPWjWxMJ0-xxsGn3ts14aWMyByjkUY_5wZRTtjev5OFc1_WRCyns",
    "d": "J-aHebo8DV-4g2c2m4P2NIvZ48uhvG052O_935Uh__PbXPQZ4rjzAvGHbYiPeGCo4LxYq38LUjdf_KdCN7Qq_vgAjA-g5Ni1Fq2row3_nW2rpZZuJh7gna2xndrE3K1Fen8ZK7EWkh9_Ab0FV0C5UKtL5NUMlytu0QEsdiHh9n0hBN1nY7YrzW3i-fUichEDI3bJNJn4vNdwsAtb-w9M0uTGJdfPnAm1yuz9OY2v9QMX2y_6Z5MqhiGV7N7sVIduH4ZLpAuGL2C42EvL7shPeQbq90QlqApCP8b3KPMP9GZmQGnuv9S4axVwKeRqALd4127Y1A0q0xTWNOTygvzh9Q",
    "e": "AQAB",
    "use": "sig",
    "kid": "TESTIN",
    "qi": "yFWRzCjcpgR0qWUvO9LCtaQ4e3zmSMy8wVQlpL0xenx2XVcU2FCzEnwvXrJQB4sz9aAEvjpSEAEeCAs1vPdAAU7Y1dEV3f14UDUWOP25u2C4bh__8DAunHBa-uHhO9k7wCIWYYTqZyKv7HrRKvsofKMCQ9QzvtaW8W48bmD_paM",
    "dp": "KCImRhKcM15UcdCimjLyoAlIAHeSiVV1JfEeXnBtAomzWCgeQZnBlvuZYVEHnL7DIDF0hmap2lIydi9lrXJ_kbshNzuUiSO5llcwm75fteH6xPPRvxCaRV7UjU11eCaZE8XNi-xwFLXzRj7_llNi0zr-7LVq_e8HniymEAlBmME",
    "alg": "RS256",
    "dq": "kgVBk1T4gQfKMrMF0-_E2xLPpyeIOoPdsVs4nmMLiYwLQ9myRemmklliSbGF9Cl_LyIrohFQQEh-IxAzq5eu_syP1YGjzV1HfeEccJ9QuwsHZgeJy4namJ_cnT2CdXOcutQFEnrK4p1pYaCXYPguUDRDFfSx0KidTWRM4H6wdsM",
    "n": "sNFfeFFjeYfdkn29v9Lih5L89vBBx5XkuNXLZ4PPRfuFqnGjcINhKPuF6Zm23Q2TWdf39yHbAz_BwM4KZxsjG30Ou2ciF4jwiAlRfdI-V16Mpkhi9FVaEwvqHLT5DI1bg8rRQkj78_znWrkZVFqB4ox242_vURk4fZo0_eB2aHC3xCSDWsyBmuJ2I-gWmodL4MCCUykq6KQJg-CvWoBEAxo2JGtE2WydQhkWAZE6YrS1pUOkOreZb_g1fVAytIrlgL-ebnQDj_zlS7PdclDvAuxP4f64q6DlZw2FYZHs9V5yFX5TtftsNGksXOg9fJuHYE89jb7mctFyF2my2CsweQ"
}'

# Create a secret
awslocal secretsmanager create-secret --name "${SECRET_NAME}" --secret-string "${SECRET_VALUE}"

set +x
