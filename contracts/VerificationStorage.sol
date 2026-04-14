// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VerificationStorage - Aegis Protocol
 * @notice Stores prediction hashes, gatekeeper logs, and ZK proofs on-chain.
 */
contract VerificationStorage {
    struct VerificationEntry {
        bytes32 dataHash;
        string entryType; // "prediction", "gatekeeper", "zk_proof", "execution"
        address submitter;
        uint256 timestamp;
    }

    VerificationEntry[] public entries;
    mapping(bytes32 => bool) public hashExists;
    mapping(bytes32 => uint256) public hashToIndex;

    event HashStored(bytes32 indexed dataHash, string entryType, address submitter);
    event HashVerified(bytes32 indexed dataHash, bool exists);

    function storeHash(bytes32 _dataHash, string calldata _entryType) external {
        require(!hashExists[_dataHash], "Hash already stored");

        uint256 idx = entries.length;
        entries.push(VerificationEntry({
            dataHash: _dataHash,
            entryType: _entryType,
            submitter: msg.sender,
            timestamp: block.timestamp
        }));

        hashExists[_dataHash] = true;
        hashToIndex[_dataHash] = idx;

        emit HashStored(_dataHash, _entryType, msg.sender);
    }

    function verifyHash(bytes32 _dataHash) external view returns (bool exists, string memory entryType, address submitter, uint256 timestamp) {
        if (!hashExists[_dataHash]) {
            return (false, "", address(0), 0);
        }
        uint256 idx = hashToIndex[_dataHash];
        VerificationEntry storage e = entries[idx];
        return (true, e.entryType, e.submitter, e.timestamp);
    }

    function getEntryCount() external view returns (uint256) {
        return entries.length;
    }

    function batchStoreHashes(bytes32[] calldata _hashes, string[] calldata _types) external {
        require(_hashes.length == _types.length, "Length mismatch");
        for (uint256 i = 0; i < _hashes.length; i++) {
            if (!hashExists[_hashes[i]]) {
                uint256 idx = entries.length;
                entries.push(VerificationEntry({
                    dataHash: _hashes[i],
                    entryType: _types[i],
                    submitter: msg.sender,
                    timestamp: block.timestamp
                }));
                hashExists[_hashes[i]] = true;
                hashToIndex[_hashes[i]] = idx;
                emit HashStored(_hashes[i], _types[i], msg.sender);
            }
        }
    }
}
