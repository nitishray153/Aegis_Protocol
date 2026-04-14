// Contract ABIs and deployment bytecodes for Aegis Protocol
// These are generated from Solidity contracts in /app/contracts/

export const CONTRACTS = {
  ModelRegistry: {
    abi: [
      "function registerModel(string calldata _modelId, bytes32 _modelHash, bytes32 _codeHash, string calldata _ipfsCid) external",
      "function getModel(string calldata _modelId) external view returns (bytes32 modelHash, bytes32 codeHash, string memory ipfsCid, address developer, uint256 timestamp)",
      "function verifyModelHash(string calldata _modelId, bytes32 _hash) external view returns (bool)",
      "function getModelCount() external view returns (uint256)",
      "event ModelRegistered(string indexed modelId, bytes32 modelHash, string ipfsCid, address developer)",
      "event ModelHashUpdated(string indexed modelId, bytes32 newHash)"
    ],
    address: null  // Set after deployment
  },
  VotingContract: {
    abi: [
      "function createProposal(string calldata _modelId) external",
      "function castVote(string calldata _modelId, uint256 _voteCount, bool _isApprove) external payable",
      "function getProposal(string calldata _modelId) external view returns (uint256 approveVotes, uint256 rejectVotes, uint256 totalVoters, bool finalized)",
      "function getProposalCount() external view returns (uint256)",
      "function getVoteCount() external view returns (uint256)",
      "function hasVoted(string calldata, address) external view returns (bool)",
      "function APPROVAL_THRESHOLD() external view returns (uint256)",
      "event ProposalCreated(string indexed modelId)",
      "event VoteCast(string indexed modelId, address voter, uint256 votes, bool isApprove, uint256 cost)",
      "event ProposalFinalized(string indexed modelId, bool approved)"
    ],
    address: null
  },
  VerificationStorage: {
    abi: [
      "function storeHash(bytes32 _dataHash, string calldata _entryType) external",
      "function verifyHash(bytes32 _dataHash) external view returns (bool exists, string memory entryType, address submitter, uint256 timestamp)",
      "function getEntryCount() external view returns (uint256)",
      "function batchStoreHashes(bytes32[] calldata _hashes, string[] calldata _types) external",
      "event HashStored(bytes32 indexed dataHash, string entryType, address submitter)",
      "event HashVerified(bytes32 indexed dataHash, bool exists)"
    ],
    address: null
  }
};

// Sepolia deployment bytecodes (simplified - real compilation needed for actual deployment)
// These are placeholder bytecodes. For production, compile with solc/hardhat.
export const DEPLOYMENT_CONFIGS = {
  network: 'sepolia',
  chainId: 11155111,
  rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/',
  blockExplorer: 'https://sepolia.etherscan.io'
};

// Local storage keys for deployed addresses
const STORAGE_KEYS = {
  ModelRegistry: 'aegis_model_registry_address',
  VotingContract: 'aegis_voting_contract_address',
  VerificationStorage: 'aegis_verification_storage_address'
};

export const saveContractAddress = (contractName, address) => {
  localStorage.setItem(STORAGE_KEYS[contractName], address);
};

export const getContractAddress = (contractName) => {
  return localStorage.getItem(STORAGE_KEYS[contractName]);
};

export const getAllContractAddresses = () => ({
  ModelRegistry: getContractAddress('ModelRegistry'),
  VotingContract: getContractAddress('VotingContract'),
  VerificationStorage: getContractAddress('VerificationStorage')
});
