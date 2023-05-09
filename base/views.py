from django.shortcuts import render, HttpResponse

# Create your views here.

def index(request):
    context={}
    return render(request,'base/index.html',context=context)
def lobby(request):
    return render(request,'base/lobby.html')
