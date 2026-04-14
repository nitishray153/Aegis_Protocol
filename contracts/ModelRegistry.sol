// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ModelRegistry - Aegis Protocol
 * @notice Stores model hashes on-chain. No admin control over model approval.
 */
contract ModelRegistry {
    struct Model {
        string modelId;
        bytes32 modelHash;
        bytes32 codeHash;
        string ipfsCid;
        address developer;
        uint256 timestamp;
        bool exists;
    }

    mapping(string => Model) public models;
    string[] public modelIds;
    
    event ModelRegistered(string indexed modelId, bytes32 modelHash, string ipfsCid, address developer);
    event ModelHashUpdated(string indexed modelId, bytes32 newHash);

    function registerModel(
        string calldata _modelId,
        bytes32 _modelHash,
        bytes32 _codeHash,
        string calldata _ipfsCid
    ) external {
        require(!models[_modelId].exists, "Model already registered");
        
        models[_modelId] = Model({
            modelId: _modelId,
            modelHash: _modelHash,
            codeHash: _codeHash,
            ipfsCid: _ipfsCid,
            developer: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        
        modelIds.push(_modelId);
        emit ModelRegistered(_modelId, _modelHash, _ipfsCid, msg.sender);
    }

    function getModel(string calldata _modelId) external view returns (
        bytes32 modelHash,
        bytes32 codeHash,
        string memory ipfsCid,
        address developer,
        uint256 timestamp
    ) {
        require(models[_modelId].exists, "Model not found");
        Model storage m = models[_modelId];
        return (m.modelHash, m.codeHash, m.ipfsCid, m.developer, m.timestamp);
    }

    function verifyModelHash(string calldata _modelId, bytes32 _hash) external view returns (bool) {
        return models[_modelId].modelHash == _hash;
    }

    function getModelCount() external view returns (uint256) {
        return modelIds.length;
    }
}
