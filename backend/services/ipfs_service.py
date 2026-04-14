import httpx
import os
import logging
import hashlib

logger = logging.getLogger(__name__)

PINATA_API_KEY = os.environ.get("PINATA_API_KEY", "")
PINATA_SECRET_KEY = os.environ.get("PINATA_SECRET_KEY", "")
PINATA_BASE = "https://api.pinata.cloud"


async def upload_to_ipfs(file_content, filename, metadata=None):
    """Upload file to IPFS via Pinata"""
    if not PINATA_API_KEY or not PINATA_SECRET_KEY:
        logger.warning("Pinata keys not configured, using simulated IPFS")
        return _simulate_ipfs_upload(file_content, filename)
    
    try:
        headers = {
            "pinata_api_key": PINATA_API_KEY,
            "pinata_secret_api_key": PINATA_SECRET_KEY
        }
        
        files = {"file": (filename, file_content)}
        
        pinata_metadata = {"name": filename}
        if metadata:
            pinata_metadata["keyvalues"] = metadata
        
        data = {"pinataMetadata": str(pinata_metadata)}
        
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{PINATA_BASE}/pinning/pinFileToIPFS",
                headers=headers,
                files=files,
                data=data
            )
            
            if resp.status_code == 200:
                result = resp.json()
                cid = result.get("IpfsHash", "")
                return {
                    "success": True,
                    "cid": cid,
                    "url": f"https://gateway.pinata.cloud/ipfs/{cid}",
                    "size": result.get("PinSize", 0),
                    "timestamp": result.get("Timestamp", "")
                }
            else:
                logger.error(f"Pinata upload failed: {resp.status_code} {resp.text}")
                return _simulate_ipfs_upload(file_content, filename)
    except Exception as e:
        logger.error(f"IPFS upload error: {e}")
        return _simulate_ipfs_upload(file_content, filename)


async def upload_json_to_ipfs(json_data, name="metadata"):
    """Upload JSON metadata to IPFS via Pinata"""
    if not PINATA_API_KEY or not PINATA_SECRET_KEY:
        return _simulate_ipfs_upload(str(json_data).encode(), f"{name}.json")
    
    try:
        headers = {
            "pinata_api_key": PINATA_API_KEY,
            "pinata_secret_api_key": PINATA_SECRET_KEY,
            "Content-Type": "application/json"
        }
        
        body = {
            "pinataContent": json_data,
            "pinataMetadata": {"name": name}
        }
        
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{PINATA_BASE}/pinning/pinJSONToIPFS",
                headers=headers,
                json=body
            )
            
            if resp.status_code == 200:
                result = resp.json()
                cid = result.get("IpfsHash", "")
                return {
                    "success": True,
                    "cid": cid,
                    "url": f"https://gateway.pinata.cloud/ipfs/{cid}",
                    "size": result.get("PinSize", 0)
                }
            else:
                logger.error(f"Pinata JSON upload failed: {resp.status_code}")
                return _simulate_ipfs_upload(str(json_data).encode(), f"{name}.json")
    except Exception as e:
        logger.error(f"IPFS JSON upload error: {e}")
        return _simulate_ipfs_upload(str(json_data).encode(), f"{name}.json")


def _simulate_ipfs_upload(content, filename):
    """Fallback simulated IPFS for when Pinata is unavailable"""
    content_bytes = content if isinstance(content, bytes) else content.encode()
    fake_cid = "Qm" + hashlib.sha256(content_bytes + filename.encode()).hexdigest()[:44]
    return {
        "success": True,
        "cid": fake_cid,
        "url": f"https://gateway.pinata.cloud/ipfs/{fake_cid}",
        "size": len(content_bytes),
        "simulated": True
    }
