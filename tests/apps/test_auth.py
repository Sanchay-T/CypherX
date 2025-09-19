import pytest
from sqlalchemy import select

from apps.domain.models.user_account import UserAccount

BASE_URL = "/auth"


@pytest.mark.asyncio
async def test_signup_creates_user_and_profile(
    client,
    db_session,
    random_email,
    password,
    cleanup_supabase_user,
):
    payload = {
        "email": random_email,
        "password": password,
        "full_name": "Test User",
        "team_size": "1-10",
    }

    response = await client.post(f"{BASE_URL}/signup", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()

    user = data["user"]
    cleanup_supabase_user(user["supabase_user_id"])

    assert user["email"] == payload["email"]
    assert user["full_name"] == payload["full_name"]
    assert user["team_size"] == payload["team_size"]
    assert data["access_token"]
    assert data["refresh_token"]

    result = await db_session.execute(
        select(UserAccount).where(UserAccount.email == payload["email"])
    )
    stored_user = result.scalar_one()
    assert str(stored_user.supabase_user_id) == user["supabase_user_id"]


@pytest.mark.asyncio
async def test_signup_duplicate_email_returns_400(
    client,
    random_email,
    password,
    cleanup_supabase_user,
):
    payload = {
        "email": random_email,
        "password": password,
        "full_name": "Existing User",
        "team_size": "11-50",
    }

    first = await client.post(f"{BASE_URL}/signup", json=payload)
    assert first.status_code == 201, first.text
    first_user = first.json()["user"]
    cleanup_supabase_user(first_user["supabase_user_id"])

    second = await client.post(f"{BASE_URL}/signup", json=payload)
    assert second.status_code == 400, second.text


@pytest.mark.asyncio
async def test_login_returns_tokens(
    client,
    random_email,
    password,
    cleanup_supabase_user,
):
    signup_payload = {
        "email": random_email,
        "password": password,
        "full_name": "Login User",
        "team_size": "51-200",
    }
    signup_response = await client.post(f"{BASE_URL}/signup", json=signup_payload)
    assert signup_response.status_code == 201, signup_response.text
    user = signup_response.json()["user"]
    cleanup_supabase_user(user["supabase_user_id"])

    login_response = await client.post(
        f"{BASE_URL}/login",
        json={"email": random_email, "password": password},
    )
    assert login_response.status_code == 200, login_response.text
    tokens = login_response.json()
    assert tokens["access_token"]
    assert tokens["refresh_token"]


@pytest.mark.asyncio
async def test_login_rejects_invalid_password(client, random_email, password):
    response = await client.post(
        f"{BASE_URL}/login",
        json={"email": random_email, "password": password},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_session_endpoint_validates_access_token(
    client,
    random_email,
    password,
    cleanup_supabase_user,
):
    signup_payload = {
        "email": random_email,
        "password": password,
        "full_name": "Session User",
        "team_size": "200+",
    }
    signup_response = await client.post(f"{BASE_URL}/signup", json=signup_payload)
    assert signup_response.status_code == 201, signup_response.text
    payload = signup_response.json()
    cleanup_supabase_user(payload["user"]["supabase_user_id"])

    access_token = payload["access_token"]
    session_response = await client.get(
        f"{BASE_URL}/session",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert session_response.status_code == 200, session_response.text
    session_user = session_response.json()["user"]
    assert session_user["email"] == signup_payload["email"]


@pytest.mark.asyncio
async def test_session_endpoint_rejects_invalid_token(client):
    response = await client.get(
        f"{BASE_URL}/session",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401
