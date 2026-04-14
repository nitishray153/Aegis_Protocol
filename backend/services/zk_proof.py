import hashlib
import json
import time
from datetime import datetime, timezone


def generate_zk_proof(model_id, input_data, output_data):
    """
    Generate a simulated ZK proof.
    proof = hash(model + input + output)
    """
    # Serialize inputs
    model_str = str(model_id)
    input_str = json.dumps(input_data, sort_keys=True, default=str)
    output_str = json.dumps(output_data, sort_keys=True, default=str)
    
    # Create proof hash
    combined = f"{model_str}|{input_str}|{output_str}|{time.time()}"
    proof_hash = hashlib.sha256(combined.encode()).hexdigest()
    
    # Create verification components
    commitment = hashlib.sha256(f"commit:{model_str}:{input_str}".encode()).hexdigest()[:32]
    challenge = hashlib.sha256(f"challenge:{proof_hash}".encode()).hexdigest()[:32]
    response = hashlib.sha256(f"response:{commitment}:{challenge}".encode()).hexdigest()[:32]
    
    return {
        "proof_hash": proof_hash,
        "commitment": commitment,
        "challenge": challenge,
        "response": response,
        "model_id": model_str,
        "input_hash": hashlib.sha256(input_str.encode()).hexdigest()[:16],
        "output_hash": hashlib.sha256(output_str.encode()).hexdigest()[:16],
        "verified": True,
        "verification_method": "SHA256-ZK-SIM",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


def verify_proof(proof_data):
    """Verify a ZK proof"""
    commitment = proof_data.get("commitment", "")
    challenge = proof_data.get("challenge", "")
    response = proof_data.get("response", "")
    proof_hash = proof_data.get("proof_hash", "")
    
    # Reconstruct expected challenge
    expected_challenge = hashlib.sha256(f"challenge:{proof_hash}".encode()).hexdigest()[:32]
    # Reconstruct expected response
    expected_response = hashlib.sha256(f"response:{commitment}:{challenge}".encode()).hexdigest()[:32]
    
    is_valid = challenge == expected_challenge and response == expected_response
    
    return {
        "is_valid": is_valid,
        "proof_hash": proof_hash,
        "verification_timestamp": datetime.now(timezone.utc).isoformat()
    }


def compute_prediction_hash(prediction_data):
    """Hash prediction for blockchain storage"""
    data_str = json.dumps(prediction_data, sort_keys=True, default=str)
    return hashlib.sha256(data_str.encode()).hexdigest()
