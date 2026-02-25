#!/bin/bash

# 尝试从配置文件中读取token
if [ -f ~/.zeroclaw/config.toml ]; then
    TOKEN_LINE=$(grep "paired_tokens" ~/.zeroclaw/config.toml | head -n1)
    if [ ! -z "$TOKEN_LINE" ]; then
        # 提取token值
        HASHED_TOKEN=$(echo "$TOKEN_LINE" | sed -E 's/.*\["([^"]+)"\].*/\1/')
        echo "Found hashed token: $HASHED_TOKEN"
        
        # 尝试配对获取实际token
        echo "Attempting to discover the real token..."
        
        # 由于我们不知道原始token，我们可以尝试直接使用API获取信息
        # 或者尝试使用一个已知的token来触发配对流程
        echo "Cannot determine original token from hash. The token is securely hashed."
        echo "To get a usable token, you would need to:"
        echo "1. Reset the paired_tokens in config.toml to []"
        echo "2. Restart the gateway to generate a new pairing code"
        echo "3. Pair with the code to get a new token"
    fi
fi