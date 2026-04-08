import jwt
from django.conf import settings
from rest_framework import authentication, exceptions

class JWTSharedAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
        
        try:
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except Exception:
            raise exceptions.AuthenticationFailed('Invalid token')

        user = {
            'user_id' : payload.get('user_id'),
            'roles' : payload.get('roles', []),
            'is_authenticated': True
        }

        return (user, payload)