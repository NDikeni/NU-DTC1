import requests


BASE_URL = "http://127.0.0.1:5000"


#
# POST /food
#
def add_food():

    payload = {
        "food_name": "Chicken Tikka Masala",
        "meal_period": "DINNER",
        "s3_bucket_id": "bucket123",
        "dining_halls": [
            "ALLISON",
            "SARGE"
        ]
    }

    response = requests.post(
        f"{BASE_URL}/food",
        json=payload
    )

    print("\nPOST /food")
    print("status:", response.status_code)
    print(response.json())


#
# GET /food
#
def get_food():

    response = requests.get(
        f"{BASE_URL}/food"
    )

    print("\nGET /food")
    print("status:", response.status_code)
    print(response.json())


#
# DELETE /reset
#
def reset_database():

    response = requests.delete(
        f"{BASE_URL}/reset"
    )

    print("\nDELETE /reset")
    print("status:", response.status_code)
    print(response.json())


#
# test both:
#

# add_food()
# reset_database()
get_food()