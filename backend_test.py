import requests
import sys
import json
from datetime import datetime

class AegisProtocolTester:
    def __init__(self, base_url="https://dao-trading-protocol.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, check_response=None):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                # Additional response validation if provided
                if check_response:
                    try:
                        response_data = response.json()
                        validation_result = check_response(response_data)
                        if not validation_result:
                            success = False
                            print(f"❌ Failed - Response validation failed")
                        else:
                            print(f"✅ Passed - Status: {response.status_code}, Response validated")
                    except Exception as e:
                        success = False
                        print(f"❌ Failed - Response validation error: {str(e)}")
                else:
                    print(f"✅ Passed - Status: {response.status_code}")
                
                if success:
                    self.tests_passed += 1
                else:
                    self.failed_tests.append(name)
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append(name)

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(name)
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "/",
            200,
            check_response=lambda r: r.get('status') == 'active'
        )

    def test_models_endpoint(self):
        """Test models endpoint and verify 4 seeded models including tf-001"""
        success, response = self.run_test(
            "Get Models",
            "GET",
            "/models",
            200,
            check_response=lambda r: (
                'models' in r and 
                len(r['models']) >= 4 and
                any(m.get('id') == 'lstm-001' for m in r['models']) and
                any(m.get('id') == 'gru-001' for m in r['models']) and
                any(m.get('id') == 'ens-001' for m in r['models']) and
                any(m.get('id') == 'tf-001' for m in r['models'])
            )
        )
        return success, response

    def test_market_prices(self):
        """Test market prices endpoint"""
        return self.run_test(
            "Market Prices",
            "GET",
            "/market/prices",
            200,
            check_response=lambda r: 'prices' in r
        )

    def test_market_indicators(self):
        """Test market indicators for bitcoin"""
        return self.run_test(
            "Market Indicators (Bitcoin)",
            "GET",
            "/market/indicators/bitcoin",
            200,
            check_response=lambda r: (
                'indicators' in r and
                'rsi' in r['indicators'] and
                'macd' in r['indicators'] and
                'ema_20' in r['indicators'] and
                'bollinger' in r['indicators']
            )
        )

    def test_fear_greed_index(self):
        """Test fear & greed index endpoint"""
        return self.run_test(
            "Fear & Greed Index",
            "GET",
            "/market/fear-greed",
            200,
            check_response=lambda r: 'fear_greed' in r
        )

    def test_signal_generation(self, model_id):
        """Test signal generation for a specific model"""
        success, response = self.run_test(
            f"Signal Generation ({model_id})",
            "GET",
            f"/signals/generate/{model_id}",
            200,
            check_response=lambda r: (
                'prediction' in r and
                'gatekeeper' in r and
                'anomaly' in r and
                'eva' in r and
                'zk_proof' in r
            )
        )
        return success, response

    def test_backtest(self, model_id, days=30):
        """Test backtesting for a model"""
        return self.run_test(
            f"Backtest ({model_id}, {days} days)",
            "GET",
            f"/backtest/{model_id}?days={days}",
            200,
            check_response=lambda r: (
                'equity_curve' in r and
                'sharpe_ratio' in r and
                'max_drawdown_pct' in r and
                'win_rate_pct' in r
            )
        )

    def test_dao_vote(self):
        """Test DAO voting endpoint"""
        vote_data = {
            "model_id": "lstm-001",
            "voter_wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
            "vote_count": 1,
            "vote_type": "approve",
            "tx_hash": "0x123456789abcdef"
        }
        return self.run_test(
            "DAO Vote",
            "POST",
            "/dao/vote",
            200,
            data=vote_data,
            check_response=lambda r: (
                'model_id' in r and
                'voter_wallet' in r and
                'vote_count' in r and
                'cost' in r
            )
        )

    def test_allocation_creation(self):
        """Test fund allocation creation"""
        allocation_data = {
            "model_id": "lstm-001",
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
            "amount": 1.5,
            "tx_hash": "0x123456789abcdef"
        }
        return self.run_test(
            "Create Allocation",
            "POST",
            "/allocations",
            200,
            data=allocation_data,
            check_response=lambda r: (
                'model_id' in r and
                'wallet_address' in r and
                'amount' in r and
                'status' in r
            )
        )

    def test_execution_creation(self):
        """Test execution creation"""
        execution_data = {
            "signal_id": "test-signal-123",
            "model_id": "lstm-001",
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
            "action": "BUY",
            "amount": 0.5,
            "tx_hash": "0x123456789abcdef"
        }
        return self.run_test(
            "Create Execution",
            "POST",
            "/executions",
            200,
            data=execution_data,
            check_response=lambda r: (
                'signal_id' in r and
                'model_id' in r and
                'wallet_address' in r and
                'action' in r
            )
        )

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        return self.run_test(
            "Admin Stats",
            "GET",
            "/admin/stats",
            200,
            check_response=lambda r: (
                'total_models' in r and
                'active_models' in r and
                'total_signals' in r and
                'total_votes' in r
            )
        )

    def test_gatekeeper_stats(self):
        """Test gatekeeper stats endpoint"""
        return self.run_test(
            "Gatekeeper Stats",
            "GET",
            "/admin/gatekeeper-stats",
            200,
            check_response=lambda r: (
                'total' in r and
                'passed' in r and
                'flagged' in r and
                'blocked' in r and
                'pass_rate' in r
            )
        )

    def test_dao_proposals(self):
        """Test DAO proposals endpoint"""
        return self.run_test(
            "DAO Proposals",
            "GET",
            "/dao/proposals",
            200,
            check_response=lambda r: 'proposals' in r
        )

    # ===== PHASE 2 FEATURES =====

    def test_binance_ticker(self, symbol="bitcoin"):
        """Test Binance ticker endpoint"""
        return self.run_test(
            f"Binance Ticker ({symbol})",
            "GET",
            f"/binance/ticker/{symbol}",
            200,
            check_response=lambda r: (
                'ticker' in r and
                'price' in r['ticker'] and
                'price_change_pct' in r['ticker'] and
                'volume' in r['ticker']
            )
        )

    def test_binance_klines(self, symbol="bitcoin", interval="1h", limit=10):
        """Test Binance klines endpoint"""
        return self.run_test(
            f"Binance Klines ({symbol}, {interval})",
            "GET",
            f"/binance/klines/{symbol}?interval={interval}&limit={limit}",
            200,
            check_response=lambda r: (
                'klines' in r and
                isinstance(r['klines'], list) and
                len(r['klines']) > 0 and
                'open' in r['klines'][0] and
                'close' in r['klines'][0]
            )
        )

    def test_binance_depth(self, symbol="bitcoin"):
        """Test Binance order book depth endpoint"""
        return self.run_test(
            f"Binance Depth ({symbol})",
            "GET",
            f"/binance/depth/{symbol}",
            200,
            check_response=lambda r: (
                'depth' in r and
                'bids' in r['depth'] and
                'asks' in r['depth']
            )
        )

    def test_binance_trades(self, symbol="bitcoin"):
        """Test Binance recent trades endpoint"""
        return self.run_test(
            f"Binance Trades ({symbol})",
            "GET",
            f"/binance/trades/{symbol}",
            200,
            check_response=lambda r: (
                'trades' in r and
                isinstance(r['trades'], list)
            )
        )

    def test_referral_register(self):
        """Test referral registration"""
        referral_data = {
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
            "referral_code": ""
        }
        return self.run_test(
            "Referral Registration",
            "POST",
            "/referral/register",
            200,
            data=referral_data,
            check_response=lambda r: (
                'wallet_address' in r and
                'referral_code' in r and
                'tier' in r
            )
        )

    def test_staking_stake(self):
        """Test staking creation"""
        stake_data = {
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
            "amount": 0.1,
            "tx_hash": "0x123456789abcdef"
        }
        return self.run_test(
            "Create Stake",
            "POST",
            "/staking/stake",
            200,
            data=stake_data,
            check_response=lambda r: (
                'wallet_address' in r and
                'amount' in r and
                'status' in r and
                'apy' in r
            )
        )

    def test_token_balance(self, wallet="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"):
        """Test token balance endpoint"""
        return self.run_test(
            f"Token Balance ({wallet[:10]}...)",
            "GET",
            f"/tokens/{wallet}",
            200,
            check_response=lambda r: (
                'wallet_address' in r and
                'balance' in r and
                'tier' in r and
                'voting_power' in r
            )
        )

    def test_contract_deployment(self):
        """Test contract deployment tracking"""
        contract_data = {
            "contract_name": "ModelRegistry",
            "address": "0x1234567890AbcdEf1234567890aBcDeF12345678",
            "tx_hash": "0x123456789abcdef",
            "deployer": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"
        }
        return self.run_test(
            "Track Contract Deployment",
            "POST",
            "/contracts/deployed",
            200,
            data=contract_data,
            check_response=lambda r: (
                'contract_name' in r and
                'address' in r and
                'network' in r and
                'chain_id' in r
            )
        )

    def test_deployed_contracts(self):
        """Test deployed contracts list"""
        return self.run_test(
            "Get Deployed Contracts",
            "GET",
            "/contracts",
            200,
            check_response=lambda r: 'contracts' in r
        )

def main():
    print("🚀 Starting Aegis Protocol API Tests")
    print("=" * 50)
    
    tester = AegisProtocolTester()
    
    # Test basic endpoints
    print("\n📋 BASIC ENDPOINTS")
    tester.test_health_check()
    
    # Test models
    print("\n🤖 AI MODELS")
    models_success, models_response = tester.test_models_endpoint()
    
    # Test market data
    print("\n📊 MARKET DATA")
    tester.test_market_prices()
    tester.test_market_indicators()
    tester.test_fear_greed_index()
    
    # Test signal generation for each model
    print("\n⚡ SIGNAL GENERATION")
    if models_success and models_response.get('models'):
        for model in models_response['models'][:4]:  # Test all 4 models including tf-001
            model_id = model.get('id')
            if model_id:
                tester.test_signal_generation(model_id)
    else:
        # Fallback to known model IDs including tf-001
        for model_id in ['lstm-001', 'gru-001', 'ens-001', 'tf-001']:
            tester.test_signal_generation(model_id)
    
    # Test backtesting
    print("\n📈 BACKTESTING")
    tester.test_backtest('lstm-001', 30)
    
    # Test DAO functionality
    print("\n🗳️ DAO FUNCTIONALITY")
    tester.test_dao_vote()
    tester.test_dao_proposals()
    
    # Test fund management
    print("\n💰 FUND MANAGEMENT")
    tester.test_allocation_creation()
    tester.test_execution_creation()
    
    # Test admin endpoints
    print("\n👨‍💼 ADMIN MONITORING")
    tester.test_admin_stats()
    tester.test_gatekeeper_stats()
    
    # ===== PHASE 2 FEATURES =====
    
    # Test Binance API integration
    print("\n🏦 BINANCE API INTEGRATION")
    tester.test_binance_ticker("bitcoin")
    tester.test_binance_klines("bitcoin", "1h", 10)
    tester.test_binance_depth("bitcoin")
    tester.test_binance_trades("bitcoin")
    
    # Test Referral system
    print("\n👥 REFERRAL SYSTEM")
    tester.test_referral_register()
    
    # Test Staking system
    print("\n🔒 STAKING SYSTEM")
    tester.test_staking_stake()
    
    # Test Token system
    print("\n🪙 TOKEN SYSTEM")
    tester.test_token_balance()
    
    # Test Contract tracking
    print("\n📜 SMART CONTRACT TRACKING")
    tester.test_contract_deployment()
    tester.test_deployed_contracts()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed tests:")
        for test in tester.failed_tests:
            print(f"   - {test}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())