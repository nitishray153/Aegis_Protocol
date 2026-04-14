// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VotingContract - Aegis Protocol DAO
 * @notice Quadratic voting: cost = votes^2. No admin override.
 */
contract VotingContract {
    struct Proposal {
        string modelId;
        uint256 approveVotes;
        uint256 rejectVotes;
        uint256 totalVoters;
        bool exists;
        bool finalized;
    }

    struct Vote {
        address voter;
        string modelId;
        uint256 voteCount;
        bool isApprove;
        uint256 cost;
        uint256 timestamp;
    }

    mapping(string => Proposal) public proposals;
    mapping(string => mapping(address => bool)) public hasVoted;
    Vote[] public allVotes;
    string[] public proposalIds;

    uint256 public constant APPROVAL_THRESHOLD = 10;

    event ProposalCreated(string indexed modelId);
    event VoteCast(string indexed modelId, address voter, uint256 votes, bool isApprove, uint256 cost);
    event ProposalFinalized(string indexed modelId, bool approved);

    function createProposal(string calldata _modelId) external {
        require(!proposals[_modelId].exists, "Proposal exists");
        proposals[_modelId] = Proposal({
            modelId: _modelId,
            approveVotes: 0,
            rejectVotes: 0,
            totalVoters: 0,
            exists: true,
            finalized: false
        });
        proposalIds.push(_modelId);
        emit ProposalCreated(_modelId);
    }

    function castVote(string calldata _modelId, uint256 _voteCount, bool _isApprove) external payable {
        require(proposals[_modelId].exists, "Proposal not found");
        require(!proposals[_modelId].finalized, "Voting closed");
        require(!hasVoted[_modelId][msg.sender], "Already voted");
        require(_voteCount > 0 && _voteCount <= 10, "Invalid vote count");

        // Quadratic cost: votes^2
        uint256 cost = _voteCount * _voteCount;

        hasVoted[_modelId][msg.sender] = true;

        if (_isApprove) {
            proposals[_modelId].approveVotes += _voteCount;
        } else {
            proposals[_modelId].rejectVotes += _voteCount;
        }
        proposals[_modelId].totalVoters += 1;

        allVotes.push(Vote({
            voter: msg.sender,
            modelId: _modelId,
            voteCount: _voteCount,
            isApprove: _isApprove,
            cost: cost,
            timestamp: block.timestamp
        }));

        emit VoteCast(_modelId, msg.sender, _voteCount, _isApprove, cost);

        // Auto-finalize if threshold met
        int256 netVotes = int256(proposals[_modelId].approveVotes) - int256(proposals[_modelId].rejectVotes);
        if (netVotes >= int256(APPROVAL_THRESHOLD)) {
            proposals[_modelId].finalized = true;
            emit ProposalFinalized(_modelId, true);
        } else if (netVotes <= -int256(APPROVAL_THRESHOLD)) {
            proposals[_modelId].finalized = true;
            emit ProposalFinalized(_modelId, false);
        }
    }

    function getProposal(string calldata _modelId) external view returns (
        uint256 approveVotes,
        uint256 rejectVotes,
        uint256 totalVoters,
        bool finalized
    ) {
        require(proposals[_modelId].exists, "Not found");
        Proposal storage p = proposals[_modelId];
        return (p.approveVotes, p.rejectVotes, p.totalVoters, p.finalized);
    }

    function getProposalCount() external view returns (uint256) {
        return proposalIds.length;
    }

    function getVoteCount() external view returns (uint256) {
        return allVotes.length;
    }
}
