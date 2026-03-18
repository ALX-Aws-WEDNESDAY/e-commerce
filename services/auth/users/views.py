from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Roles
from .serializer import RegisterSerializer, LoginSerializer, UserSerializer, UserDetailSerializer


class UserRegisterViewset(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'login':
            return LoginSerializer
        elif self.action == 'retrieve' or self.action == 'update' or self.action == 'partial_update':
            return UserDetailSerializer
        elif self.action == 'list':
            return UserSerializer
        return RegisterSerializer

    def get_permissions(self):
        if self.action in ['login', 'create', 'register']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        #Register a new user
    
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Create default user role
        Roles.objects.create(user=user, role='user')
        
        #refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            #'refresh': str(refresh),
            #'access': str(refresh.access_token),
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
    
        #Login user with email and password

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = User.objects.get(email = email)
        
        refresh = RefreshToken.for_user(user)
        user_roles = Roles.objects.filter(user=user).values_list('role', flat=True)
        refresh["roles"] = list(user_roles)
        refresh["user_id"] = user.id
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def refresh_token(self, request):
        """
        Refresh access token using refresh token
        """
        refresh = request.data.get('refresh')
        if not refresh:
            return Response(
                {'error': 'Refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            refresh_token = RefreshToken(refresh)
            access_token = refresh_token.access_token
            return Response({
                'access': str(access_token),
                'message': 'Token refreshed successfully'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """
        Logout user (token blacklisting handled by frontend)
        """
        return Response(
            {'message': 'Logout successful'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Get current user information
        """
        user = request.user
        user_roles = Roles.objects.filter(user=user).values_list('role', flat=True)
        
        return Response({
            'user': UserDetailSerializer(user).data,
            'roles': list(user_roles)
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def assign_role(self, request, pk=None):
        """
        Assign role to a user (admin only)
        User must be an admin to assign roles
        """
        user = self.get_object()
        current_user = request.user
        
        # Check if current user is admin
        is_admin = Roles.objects.filter(
            user=current_user, 
            role__iexact='admin'
        ).exists()
        
        if not is_admin:
            return Response(
                {'error': 'Only admins can assign roles'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        role = request.data.get('role')
        if not role:
            return Response(
                {'error': 'Role is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        valid_roles = ['user', 'agent', 'admin']
        if role.lower() not in valid_roles:
            return Response(
                {'error': f'Role must be one of {valid_roles}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update or create role
        role_obj, created = Roles.objects.update_or_create(
            user=user,
            defaults={'role': role.lower()}
        )
        
        return Response({
            'message': f'Role assigned successfully',
            'user': UserSerializer(user).data,
            'role': role_obj.role
        }, status=status.HTTP_200_OK)

    def get_queryset(self):
        """
        Filter users based on permissions
        Only show current user's data or all users if admin
        """
        user = self.request.user
        if not user.is_authenticated:
            return User.objects.none()
        
        is_admin = Roles.objects.filter(
            user=user,
            role__iexact='admin'
        ).exists()
        
        if is_admin:
            return User.objects.all()
        else:
            return User.objects.filter(id=user.id)