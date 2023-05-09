from django.urls import path
from .views import lobby, index

urlpatterns = [
    path('',index,name="index"),
    path('lobby',lobby,name="lobby")
]
