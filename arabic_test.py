#!/usr/bin/env python3
"""
Arabic Interface English Text Investigation
Tests specifically for the user's request about English text in Arabic interface
"""

import requests
import json
from backend_test import HomeMeFlutterTestSuite

def run_arabic_investigation():
    """Run specific tests for Arabic interface English text investigation"""
    print("🔍 ARABIC INTERFACE ENGLISH TEXT INVESTIGATION")
    print("=" * 60)
    
    suite = HomeMeFlutterTestSuite()
    
    # Authenticate first
    print("\n🔐 Authenticating...")
    if not suite.test_admin_authentication():
        print("❌ Authentication failed - cannot proceed")
        return
    
    print(f"✅ Authenticated successfully - Compound ID: {suite.admin_user.get('compound_id')}")
    
    # Test services data
    print("\n🔍 Testing Services Data for English Text...")
    suite.test_services_management_data()
    
    # Test database sample data
    print("\n🔍 Testing Database for English Sample Data...")
    suite.test_database_sample_data_check()
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 INVESTIGATION SUMMARY")
    print("=" * 60)
    
    failed_tests = [result for result in suite.results if "FAIL" in result["status"]]
    passed_tests = [result for result in suite.results if "PASS" in result["status"]]
    
    print(f"✅ PASSED: {len(passed_tests)} tests")
    print(f"❌ FAILED: {len(failed_tests)} tests")
    
    if failed_tests:
        print("\n❌ ISSUES FOUND:")
        for test in failed_tests:
            print(f"   • {test['test']}: {test['message']}")
            if test['details']:
                print(f"     Details: {test['details'][:200]}...")
    
    if passed_tests:
        print("\n✅ SUCCESSFUL TESTS:")
        for test in passed_tests:
            print(f"   • {test['test']}: {test['message']}")

if __name__ == "__main__":
    run_arabic_investigation()