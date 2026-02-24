// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract DebugCheck {
    function testKeySearch(string memory data, string memory key) external pure returns (bool, uint256, bytes1, bytes1) {
        bytes memory dataBytes = bytes(data);
        bytes memory keyBytes = bytes(key);
        
        if (dataBytes.length == 0 || keyBytes.length == 0) {
            return (false, 0, 0, 0);
        }
        
        for (uint i = 0; i <= dataBytes.length - keyBytes.length; i++) {
            bool found = true;
            
            for (uint j = 0; j < keyBytes.length; j++) {
                if (dataBytes[i + j] != keyBytes[j]) {
                    found = false;
                    break;
                }
            }
            
            if (found) {
                uint keyEnd = i + keyBytes.length;
                bytes1 nextChar = keyEnd < dataBytes.length ? dataBytes[keyEnd] : bytes1(0);
                bytes1 prevChar = i > 0 ? dataBytes[i - 1] : bytes1(0);
                return (true, i, nextChar, prevChar);
            }
        }
        
        return (false, 999, 0, 0);
    }
}
