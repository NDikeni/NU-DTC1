import requests

def add_user():
    response = requests.get(f'http://127.0.0.1:5000/add_user/')
    if response.status_code == 200:
        return response.json()
    else:
        return None

# Example usage
user = add_user()
print(user)