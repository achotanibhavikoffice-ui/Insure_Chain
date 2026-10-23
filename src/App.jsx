import React, { useState, useEffect, useRef } from "react";
import Login from "./Login";
import Register from "./Register";
import LandingPage from "./LandingPage";
import DashboardOverview from "./DashboardOverview";
import { getProvider, INSURANCE_PROVIDERS } from "./providers";
import { BrowserProvider, Contract, id } from "ethers";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FileCheck2,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  Wallet,
  X,
  Activity,
  LogOut,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Policy Creation", icon: FileCheck2 },
  { id: 2, title: "ZKP Data Collection", icon: LockKeyhole },
  { id: 3, title: "Proof Submission", icon: Fingerprint },
  { id: 4, title: "On-chain Verification", icon: ShieldCheck },
];

const INITIAL_FORM_DATA = {
  minIncome: "50000",
  minCreditScore: "650",
  maxMedicalRisk: "100",
};

function validateEligibilityInput(data, credential, walletAddress) {
  if (!credential?.claims || !credential?.signature || !credential?.issuer || !credential?.merkle) return "Select a valid issuer-signed credential JSON file.";
  const { claims, signature, issuer, merkle } = credential;
  const ranges = {
    income: 64,
    creditScore: 16,
    medicalRisk: 16,
    credentialId: 248,
    credentialExpiry: 64,
    minIncome: 64,
    minCreditScore: 16,
    maxMedicalRisk: 16,
  };
  for (const [field, bits] of Object.entries(ranges)) {
    const value = field in claims ? claims[field] : data[field];
    if (!/^[0-9]+$/.test(String(value ?? "")) || BigInt(value) >= 2n ** BigInt(bits)) return `${field} is missing or outside the supported range.`;
  }
  if (!/^[0-9]+$/.test(String(claims.holderAddress ?? ""))) return "Credential wallet binding is malformed.";
  if (!/^[0-9]+$/.test(String(walletAddress || ""))) return "Connect the wallet named by the credential.";
  if (BigInt(claims.holderAddress) !== BigInt(walletAddress)) return "This credential is bound to a different wallet.";
  if (BigInt(claims.credentialExpiry) <= BigInt(Math.floor(Date.now() / 1000))) return "This issuer credential has expired.";
  if (!Array.isArray(merkle.siblings) || merkle.siblings.length !== 4 || !Number.isInteger(merkle.index) || merkle.index < 0 || merkle.index >= 16) return "The credential has an invalid active-registry Merkle path.";
  if (![signature.R8x, signature.R8y, signature.S, issuer.Ax, issuer.Ay, merkle.root, ...merkle.siblings].every((value) => /^[0-9]+$/.test(String(value ?? "")))) return "The credential signature or registry proof is incomplete.";
  if (BigInt(claims.income) < BigInt(data.minIncome)) return "The signed income credential does not meet this policy's minimum.";
  if (BigInt(claims.creditScore) < BigInt(data.minCreditScore)) return "The signed credit credential does not meet this policy's minimum.";
  if (BigInt(claims.medicalRisk) > BigInt(data.maxMedicalRisk)) return "The signed medical-risk credential exceeds this policy's maximum.";
  return "";
}
function shorten(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

const POLICY_ABI = [
  "function getPolicyIds(address holder) view returns (uint256[])",
  "function policies(uint256 policyId) view returns (address holder,uint256 createdAt,uint256 activatedAt,uint256 minIncome,uint256 minCreditScore,uint256 maxMedicalRisk,uint256 proofNonce,uint8 status)",
];

function policyMetadataKey(chain, holder, id) {
  return `insurechain:policy:${chain}:${holder.toLowerCase()}:${id}`;
}

function App() {
  // --- WEB2 AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginIdentity, setLoginIdentity] = useState({ aadhaarNumber: "", dob: "" });
  const [customerDetails, setCustomerDetails] = useState({ name: "", mobile: "", email: "", address: "", aadhaarNumber: "", dob: "" });
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [currentView, setCurrentView] = useState("home");
  const [dashboardView, setDashboardView] = useState("overview");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [demoNoticeAccepted, setDemoNoticeAccepted] = useState(false);
  const termsAcceptanceRef = useRef(null);
  const [userPolicies, setUserPolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [policiesError, setPoliciesError] = useState("");
  const [policiesRefreshVersion, setPoliciesRefreshVersion] = useState(0);

  // --- WEB3 / METAMASK STATE ---
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(true);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const [credentialData, setCredentialData] = useState(null);
  const [credentialFileName, setCredentialFileName] = useState("");
  const [verified, setVerified] = useState(false);
  const [premiumPaid, setPremiumPaid] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentTxHash, setPaymentTxHash] = useState("");
  const [zkpBusy, setZkpBusy] = useState(false);
  const [realZkpError, setRealZkpError] = useState("");

  // --- ZKP & TRANSACTION HASH STATES ---
  const [zkpData, setZkpData] = useState(null);
  const [zkpHash, setZkpHash] = useState("");
  const [policyTxHash, setPolicyTxHash] = useState("");
  const [txHash, setTxHash] = useState("");
  const [policyId, setPolicyId] = useState("");
  const workflowRevision = useRef(0);
  const operationActive = useRef(false);
  const configuredChainId = import.meta.env.VITE_CHAIN_ID || "31337";
  const wrongNetwork = Boolean(chainId) && (() => {
    try { return BigInt(chainId) !== BigInt(configuredChainId); }
    catch { return false; }
  })();
  const chosenProvider = getProvider(selectedProvider);

  function resetWorkflow() {
    workflowRevision.current += 1;
    operationActive.current = false;
    setStep(1);
    setSelectedProvider("");
    setShowTermsModal(false);
    setTermsConfirmed(false);
    setDemoNoticeAccepted(false);
    termsAcceptanceRef.current = null;
    setFormData(INITIAL_FORM_DATA);
    setCredentialData(null);
    setCredentialFileName("");
    setVerified(false);
    setPremiumPaid(false);
    setShowPaymentModal(false);
    setPaymentBusy(false);
    setPaymentError("");
    setPaymentTxHash("");
    setZkpBusy(false);
    setRealZkpError("");
    setZkpData(null);
    setZkpHash("");
    setPolicyTxHash("");
    setTxHash("");
    setPolicyId("");
    setShowCustomerDetails(false);
  }

  // --- 1. CHECK FOR SAVED WEB2 LOGIN ON LOAD ---
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const savedIdentity = localStorage.getItem("insurechain:login-identity");
    if (savedIdentity) {
      try { setLoginIdentity(JSON.parse(savedIdentity)); } catch { localStorage.removeItem("insurechain:login-identity"); }
    }
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // These screens are state-based routes, so reset the old page's scroll
  // position whenever navigation or a guided-flow step changes.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentView, isAuthenticated, dashboardView, step]);

  // Read this wallet's policy records directly from the deployed contract.
  // Insurer and plan labels are local presentation metadata; the contract
  // remains the source of truth for ownership, thresholds, and activation.
  useEffect(() => {
    const policyAddress = import.meta.env.VITE_POLICY_CONTRACT_ADDRESS;
    if (!account || !chainId || dashboardView !== "overview" || wrongNetwork || !policyAddress || !window.ethereum) {
      setUserPolicies([]);
      setPoliciesLoading(false);
      setPoliciesError(!policyAddress && account ? "Policy contract address is not configured." : "");
      return undefined;
    }

    let cancelled = false;
    async function loadWalletPolicies() {
      setPoliciesLoading(true);
      setPoliciesError("");
      try {
        const provider = new BrowserProvider(window.ethereum);
        const contract = new Contract(policyAddress, POLICY_ABI, provider);
        const ids = await contract.getPolicyIds(account);
        const policies = await Promise.all(ids.map(async (policyIdValue) => {
          const idValue = policyIdValue.toString();
          const record = await contract.policies(policyIdValue);
          let metadata = {};
          try {
            metadata = JSON.parse(localStorage.getItem(policyMetadataKey(configuredChainId, account, idValue)) || "{}");
          } catch {
            metadata = {};
          }
          const selectedPlan = getProvider(metadata.providerId);
          const statusNumber = Number(record.status);
          return {
            id: idValue,
            providerName: selectedPlan?.name || metadata.providerName || "InsureChain policy",
            planName: selectedPlan?.plan || metadata.planName || "Eligibility verification record",
            initials: selectedPlan?.initials,
            accent: selectedPlan?.accent,
            soft: selectedPlan?.soft,
            status: statusNumber === 3 ? "Active" : statusNumber === 2 ? "PaymentDue" : statusNumber === 1 ? "Pending" : statusNumber === 4 ? "Rejected" : "Unknown",
            createdAt: Number(record.createdAt),
            minIncome: record.minIncome.toString(),
            minCreditScore: record.minCreditScore.toString(),
            maxMedicalRisk: record.maxMedicalRisk.toString(),
            termsVersion: metadata.termsVersion || "",
            termsAcceptedAt: metadata.termsAcceptedAt || "",
            acceptedTerms: Array.isArray(metadata.acceptedTerms) ? metadata.acceptedTerms : [],
            termsSourceUrl: metadata.termsSourceUrl || selectedPlan?.termsSourceUrl || "",
            customerDetails: metadata.customerDetails || null,
          };
        }));
        policies.sort((a, b) => BigInt(a.id) === BigInt(b.id) ? 0 : BigInt(a.id) > BigInt(b.id) ? -1 : 1);
        if (!cancelled) setUserPolicies(policies);
      } catch (loadError) {
        if (!cancelled) {
          setUserPolicies([]);
          setPoliciesError(loadError?.shortMessage || loadError?.message || "Could not load this wallet's policy records from the local network.");
        }
      } finally {
        if (!cancelled) setPoliciesLoading(false);
      }
    }

    loadWalletPolicies();
    return () => { cancelled = true; };
  }, [account, chainId, dashboardView, wrongNetwork, configuredChainId, policiesRefreshVersion]);

  // --- 2. METAMASK LISTENERS ---
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      const next = accounts?.[0] || "";
      setAccount(next);
      setShowLogin(!next);
      setDashboardView("overview");
      resetWorkflow();
    };

    const handleChainChanged = (newChainId) => {
      setChainId(newChainId);
      setDashboardView("overview");
      resetWorkflow();
    };

    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if (accounts?.[0]) {
        setAccount(accounts[0]);
        setShowLogin(false);
      }
    });

    window.ethereum.request({ method: "eth_chainId" }).then(setChainId);

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  async function connectWallet() {
    setError("");
    if (!window.ethereum) {
      setError("MetaMask was not detected. Install the MetaMask browser extension and refresh this page.");
      return;
    }

    try {
      setConnecting(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const currentChain = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(currentChain);

      setAccount(accounts[0]);
      setShowLogin(false);
    } catch (err) {
      if (err?.code === 4001) {
        setError("Connection request was rejected in MetaMask.");
      } else {
        setError(err?.message || "Could not connect to MetaMask.");
      }
    } finally {
      setConnecting(false);
    }
  }

  async function switchToConfiguredNetwork() {
    if (!window.ethereum) {
      setError("MetaMask was not detected. Install the extension and refresh this page.");
      return;
    }
    const targetId = BigInt(configuredChainId);
    const targetHex = `0x${targetId.toString(16)}`;
    const rpcUrl = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";
    try {
      setError("");
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetHex }] });
    } catch (switchError) {
      if (switchError?.code !== 4902) {
        setError(switchError?.message || "Could not switch MetaMask to the configured network.");
        return;
      }
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: targetHex,
            chainName: "InsureChain Local",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [rpcUrl],
          }],
        });
      } catch (addError) {
        setError(addError?.message || "Could not add the configured network to MetaMask.");
        return;
      }
    }
    const activeChainId = await window.ethereum.request({ method: "eth_chainId" });
    setChainId(activeChainId);
  }

  function disconnect() {
    setAccount("");
    setShowLogin(true);
    setDashboardView("overview");
    resetWorkflow();
    
    localStorage.removeItem("authToken");
    localStorage.removeItem("insurechain:login-identity");
    setLoginIdentity({ aadhaarNumber: "", dob: "" });
    setCustomerDetails({ name: "", mobile: "", email: "", address: "", aadhaarNumber: "", dob: "" });
    setIsAuthenticated(false);
    setCurrentView("login");
  }

  function startOnboarding(providerId = "") {
    resetWorkflow();
    setSelectedProvider(providerId);
    setDashboardView("onboarding");
  }

  function openCustomerDetails() {
    setCustomerDetails((previous) => ({ ...previous, aadhaarNumber: loginIdentity.aadhaarNumber || previous.aadhaarNumber, dob: loginIdentity.dob || previous.dob }));
    setShowCustomerDetails(true);
  }

  function handleCustomerDetailsChange(event) {
    const { name, value } = event.target;
    setCustomerDetails((previous) => ({ ...previous, [name]: value }));
  }

  function continueToDataInput(event) {
    event.preventDefault();
    setShowCustomerDetails(false);
    setStep(2);
  }

  function openTermsReview() {
    if (!chosenProvider) {
      setStep(1);
      return;
    }
    setTermsConfirmed(false);
    setDemoNoticeAccepted(false);
    setShowTermsModal(true);
  }

  function acceptTermsAndContinue() {
    if (!chosenProvider || !termsConfirmed || !demoNoticeAccepted) return;
    const accepted = {
      providerId: chosenProvider.id,
      termsVersion: chosenProvider.termsVersion,
      acceptedAt: new Date().toISOString(),
      terms: [...chosenProvider.terms],
      sourceUrl: chosenProvider.termsSourceUrl,
    };
    termsAcceptanceRef.current = accepted;
    setShowTermsModal(false);
    setStep(4);
    generateAndVerifyOnChain();
  }

  function rememberSelectedPolicy(activePolicyId) {
    const provider = getProvider(selectedProvider);
    if (!provider || !account) return;
    const acceptance = termsAcceptanceRef.current;
    try {
      localStorage.setItem(policyMetadataKey(configuredChainId, account, activePolicyId.toString()), JSON.stringify({
        providerId: provider.id,
        termsVersion: acceptance?.providerId === provider.id ? acceptance.termsVersion : "",
        termsAcceptedAt: acceptance?.providerId === provider.id ? acceptance.acceptedAt : "",
        acceptedTerms: acceptance?.providerId === provider.id ? acceptance.terms : [],
        termsSourceUrl: acceptance?.providerId === provider.id ? acceptance.sourceUrl : provider.termsSourceUrl,
        customerDetails,
      }));
    } catch {
      // The on-chain policy remains visible even if this browser cannot store
      // the optional provider/plan display label.
    }
  }

  function invalidateGeneratedProof() {
    setRealZkpError("");
    setZkpData(null);
    setZkpHash("");
    setPolicyId("");
    setPolicyTxHash("");
    setTxHash("");
    setVerified(false);
  }

  function handleInputChange(event) {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
    invalidateGeneratedProof();
  }

  async function handleCredentialFileChange(event) {
    const file = event.target.files?.[0];
    setCredentialData(null);
    setCredentialFileName("");
    invalidateGeneratedProof();
    if (!file) return;
    try {
      const credential = JSON.parse(await file.text());
      const claims = credential?.claims;
      if (!claims || !credential?.signature || !credential?.issuer || !credential?.merkle) {
        throw new Error("This file is not an InsureChain signed credential.");
      }
      setCredentialData(credential);
      setCredentialFileName(file.name);
      setRealZkpError("");
    } catch (err) {
      setRealZkpError(err?.message || "Could not read this credential file.");
    }
  }

  function processDataCollection() {
    setRealZkpError("");
    const validationError = validateEligibilityInput(formData, credentialData, account);
    if (validationError) {
      setRealZkpError(validationError);
      return;
    }
    setZkpData(null);
    setZkpHash("");
    setPolicyId("");
    setPolicyTxHash("");
    setTxHash("");
    setVerified(false);
    setStep(3);
  }

  // --- SUBMIT GENERATED ZKP ON-CHAIN ---
  async function generateAndVerifyOnChain() {
    if (operationActive.current) return;
    if (!chosenProvider || termsAcceptanceRef.current?.providerId !== chosenProvider.id || termsAcceptanceRef.current?.termsVersion !== chosenProvider.termsVersion) {
      openTermsReview();
      return;
    }
    setRealZkpError("");

    const policyAddress = import.meta.env.VITE_POLICY_CONTRACT_ADDRESS;
    if (!policyAddress) {
      setRealZkpError("Missing VITE_POLICY_CONTRACT_ADDRESS in environment variables.");
      return;
    }

    operationActive.current = true;
    const revision = ++workflowRevision.current;
    try {
      setZkpBusy(true);

      const activeChainId = await window.ethereum.request({ method: "eth_chainId" });
      if (revision !== workflowRevision.current) return;
      setChainId(activeChainId);
      if (BigInt(activeChainId) !== BigInt(configuredChainId)) {
        throw new Error(`Wrong MetaMask network. Switch to chain ID ${configuredChainId} before submitting.`);
      }

      const provider = new BrowserProvider(window.ethereum);
      const deployedCode = await provider.getCode(policyAddress);
      if (revision !== workflowRevision.current) return;
      if (!deployedCode || deployedCode === "0x") {
        throw new Error(`No policy contract is deployed at ${policyAddress} on chain ${configuredChainId}. Deploy the contracts and update VITE_POLICY_CONTRACT_ADDRESS, then restart the frontend.`);
      }
      
      const signer = await provider.getSigner();
      if (revision !== workflowRevision.current) return;
      const holder = await signer.getAddress();
      const abi = [
        "function createPolicy(uint256,uint256,uint256) external returns (uint256)",
        "function submitEligibilityProof(uint256,uint256[2],uint256[2][2],uint256[2],uint256[12]) external",
        "function payFirstPremium(uint256) external",
        "function getPolicyIds(address holder) view returns (uint256[])",
        "function policies(uint256 policyId) view returns (address holder,uint256 createdAt,uint256 activatedAt,uint256 minIncome,uint256 minCreditScore,uint256 maxMedicalRisk,uint256 proofNonce,uint8 status)",
        "event PolicyCreated(uint256 indexed policyId, address indexed holder, uint256 minIncome, uint256 minCreditScore, uint256 maxMedicalRisk)"
      ];
      const contract = new Contract(policyAddress, abi, signer);
      try {
        await contract.getPolicyIds(holder);
      } catch {
        throw new Error(`The address in VITE_POLICY_CONTRACT_ADDRESS has code, but it is not a compatible LifeInsurancePolicy contract on chain ${configuredChainId}. Redeploy the policy contract and update the address.`);
      }

      let activePolicyId = policyId ? BigInt(policyId) : null;
      if (activePolicyId === null) {
        let createReceipt = null;
        if (policyTxHash) {
          createReceipt = await provider.getTransactionReceipt(policyTxHash);
          if (revision !== workflowRevision.current) return;
          if (!createReceipt) {
            throw new Error("The previous policy creation transaction is still pending. Wait for it to finish before retrying.");
          }
          if (createReceipt.status !== 1) {
            createReceipt = null;
            setPolicyTxHash("");
          }
        }

        if (!createReceipt) {
          const txCreate = await contract.createPolicy(formData.minIncome, formData.minCreditScore, formData.maxMedicalRisk);
          if (revision !== workflowRevision.current) return;
          setPolicyTxHash(txCreate.hash);
          createReceipt = await txCreate.wait();
        }
        if (revision !== workflowRevision.current) return;
        const eventLog = createReceipt.logs
          .map((log) => {
            try { return contract.interface.parseLog(log); } catch { return null; }
          })
          .find((log) => log?.name === "PolicyCreated");
        if (eventLog?.args?.policyId !== undefined) {
          activePolicyId = BigInt(eventLog.args.policyId);
        } else {
          // Recover the ID from contract state if a wallet/provider omits or
          // fails to decode the PolicyCreated event in the receipt.
          const createdIds = await contract.getPolicyIds(holder);
          const candidateId = createdIds.at(-1);
          if (candidateId === undefined) {
            throw new Error("The policy transaction succeeded, but no policy is registered for this wallet. Check that the configured address is the deployed LifeInsurancePolicy contract.");
          }
          const candidate = await contract.policies(candidateId);
          const matchesCreatedPolicy =
            candidate.holder.toLowerCase() === holder.toLowerCase() &&
            BigInt(candidate.minIncome) === BigInt(formData.minIncome) &&
            BigInt(candidate.minCreditScore) === BigInt(formData.minCreditScore) &&
            BigInt(candidate.maxMedicalRisk) === BigInt(formData.maxMedicalRisk) &&
            BigInt(candidate.status) === 1n;
          if (!matchesCreatedPolicy) {
            throw new Error("The newest policy for this wallet does not match the submitted proof thresholds. Check the contract deployment before retrying.");
          }
          activePolicyId = BigInt(candidateId);
        }
        setPolicyId(activePolicyId.toString());
      }

      const policy = await contract.policies(activePolicyId);
      if (revision !== workflowRevision.current) return;
      if (BigInt(policy.status) !== 1n) throw new Error("This policy is no longer waiting for an eligibility proof.");
      const validationError = validateEligibilityInput(formData, credentialData, holder);
      if (validationError) throw new Error(validationError);

      const activeRoot = BigInt(await contract.credentialRoot()).toString();
      const issuerAx = BigInt(await contract.issuerAx()).toString();
      const issuerAy = BigInt(await contract.issuerAy()).toString();
      if (BigInt(credentialData.merkle.root) !== BigInt(activeRoot)) {
        throw new Error("This credential uses an outdated issuer registry root. Reissue its Merkle path or publish the matching active root.");
      }
      if (BigInt(credentialData.issuer.Ax) !== BigInt(issuerAx) || BigInt(credentialData.issuer.Ay) !== BigInt(issuerAy)) {
        throw new Error("This credential was signed by an issuer key that the policy contract does not trust.");
      }

      let currentZkp = zkpData;
      if (!currentZkp) {
        const snarkjs = await import("snarkjs");
        const wasmUrl = "/zkp/LifeInsuranceEligibility.wasm";
        const zkeyUrl = "/zkp/LifeInsuranceEligibility_final.zkey";
        const claims = credentialData.claims;
        const circuitInput = {
          income: String(claims.income),
          creditScore: String(claims.creditScore),
          medicalRisk: String(claims.medicalRisk),
          credentialId: String(claims.credentialId),
          merkleIndex: String(credentialData.merkle.index),
          merkleSiblings: credentialData.merkle.siblings.map(String),
          signatureR8x: String(credentialData.signature.R8x),
          signatureR8y: String(credentialData.signature.R8y),
          signatureS: String(credentialData.signature.S),
          minIncome: String(formData.minIncome),
          minCreditScore: String(formData.minCreditScore),
          maxMedicalRisk: String(formData.maxMedicalRisk),
          holderAddress: BigInt(holder).toString(),
          policyId: activePolicyId.toString(),
          policyNonce: BigInt(policy.proofNonce).toString(),
          credentialRoot: activeRoot,
          credentialExpiry: String(claims.credentialExpiry),
          issuerAx,
          issuerAy,
        };
        currentZkp = await snarkjs.groth16.fullProve(circuitInput, wasmUrl, zkeyUrl);
        if (revision !== workflowRevision.current) return;
        setZkpData(currentZkp);
        setZkpHash(id(JSON.stringify(currentZkp)));
      }

      const { proof, publicSignals } = currentZkp;
      if (!Array.isArray(publicSignals) || publicSignals.length !== 12 || BigInt(publicSignals[0]) !== 1n) {
        throw new Error("The generated proof does not prove the expected eligible statement.");
      }
      const signals = publicSignals.map((signal) => BigInt(signal));
      if (signals[2] !== BigInt(formData.minIncome) || signals[3] !== BigInt(formData.minCreditScore) || signals[4] !== BigInt(formData.maxMedicalRisk) || signals[5] !== BigInt(holder) || signals[6] !== activePolicyId || signals[7] !== BigInt(policy.proofNonce) || signals[8] !== BigInt(activeRoot) || signals[9] !== BigInt(credentialData.claims.credentialExpiry) || signals[10] !== BigInt(issuerAx) || signals[11] !== BigInt(issuerAy)) {
        throw new Error("The proof is bound to a different wallet, policy, challenge, registry root, or threshold. Generate it again.");
      }
      rememberSelectedPolicy(activePolicyId);
      setPoliciesRefreshVersion((version) => version + 1);

      const a = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
      const b = [
        [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
        [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]
      ];
      const c = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];

      if (txHash) {
        const previousReceipt = await provider.getTransactionReceipt(txHash);
        if (revision !== workflowRevision.current) return;
        if (previousReceipt?.status === 1) {
          rememberSelectedPolicy(activePolicyId);
          setVerified(true);
          setShowPaymentModal(true);
          setPoliciesRefreshVersion((version) => version + 1);
          return;
        }
        if (!previousReceipt) {
          throw new Error("The previous proof transaction is still pending. Wait for it to finish before retrying.");
        }
      }

      const tx = await contract.submitEligibilityProof(activePolicyId, a, b, c, signals);
      if (revision !== workflowRevision.current) return;
      setTxHash(tx.hash);
      await tx.wait();
      if (revision !== workflowRevision.current) return;
      rememberSelectedPolicy(activePolicyId);
      setVerified(true);
      setShowPaymentModal(true);
      setPoliciesRefreshVersion((version) => version + 1);
    } catch (err) {
      if (revision === workflowRevision.current) {
        setRealZkpError(err?.shortMessage || err?.message || "Real ZKP generation/verification failed.");
      }
    } finally {
      if (revision === workflowRevision.current) {
        operationActive.current = false;
        setZkpBusy(false);
      }
    }
  }

  async function payFirstPremium(targetPolicyId = policyId) {
    if (!targetPolicyId || paymentBusy) return;
    const policyAddress = import.meta.env.VITE_POLICY_CONTRACT_ADDRESS;
    if (!policyAddress) {
      setPaymentError("Missing VITE_POLICY_CONTRACT_ADDRESS in environment variables.");
      return;
    }

    try {
      setPaymentError("");
      setPaymentBusy(true);
      const activeChainId = await window.ethereum.request({ method: "eth_chainId" });
      if (BigInt(activeChainId) !== BigInt(configuredChainId)) {
        throw new Error("Switch MetaMask to chain ID " + configuredChainId + " before confirming the demo payment.");
      }
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(policyAddress, ["function payFirstPremium(uint256) external"], signer);
      const tx = await contract.payFirstPremium(BigInt(targetPolicyId));
      setPaymentTxHash(tx.hash);
      const receipt = await tx.wait();
      if (receipt?.status !== 1) throw new Error("The demo payment transaction did not complete.");
      setPremiumPaid(true);
      setShowPaymentModal(false);
      setPoliciesRefreshVersion((version) => version + 1);
    } catch (err) {
      setPaymentError(err?.shortMessage || err?.message || "Could not record the demo premium payment.");
    } finally {
      setPaymentBusy(false);
    }
  }

  function resumePremiumPayment(targetPolicyId) {
    setPolicyId(String(targetPolicyId));
    setStep(4);
    setVerified(true);
    setPremiumPaid(false);
    setPaymentError("");
    setPaymentTxHash("");
    setDashboardView("onboarding");
    setShowPaymentModal(true);
  }

  // Public home page and account screens.
  if (!isAuthenticated) {
    if (currentView === "home") {
      return <LandingPage onLogin={() => setCurrentView("login")} onRegister={() => setCurrentView("register")} />;
    }
    return (
      <div className="auth-shell">
          {currentView === "login" ? (
            <Login 
              setView={setCurrentView} 
              onLoginSuccess={(identity) => {
                setLoginIdentity(identity);
                localStorage.setItem("insurechain:login-identity", JSON.stringify(identity));
                setIsAuthenticated(true);
              }}
              onHome={() => setCurrentView("home")}
            />
          ) : (
            <Register 
              setView={setCurrentView} 
              onHome={() => setCurrentView("home")}
            />
          )}
      </div>
    );
  }

  // --- 4. SHOW METAMASK CONNECT IF NO WALLET FOUND ---
  if (showLogin || !account) {
    return (
      <div className="app-shell login-shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark"><ShieldCheck size={21} /></div>
            <div>
              <div className="brand-name">InsureChain</div>
              <div className="brand-sub">ZKP LIFE INSURANCE</div>
            </div>
          </div>
          <div className="top-actions">
            <button className="button button-outline button-small" onClick={disconnect}><ArrowLeft size={14} /> Back to sign in</button>
          </div>
        </header>

        <main className="login-main">
          <section className="login-card">
            <div className="card-icon"><Wallet size={28} /></div>
            <h2>Connect your wallet</h2>
            <p>Connect your MetaMask wallet to launch the live ZKP insurance protocol.</p>
            <button className="primary-btn wallet-btn" onClick={connectWallet} disabled={connecting}>
              {connecting ? <RefreshCw className="spin" size={19} /> : <Wallet size={19} />}
              {connecting ? "Connecting..." : "Connect MetaMask"}
            </button>
            {error && <div className="error-box"><X size={16} /><span>{error}</span></div>}
          </section>
        </main>
      </div>
    );
  }

  if (dashboardView === "overview") {
    return <DashboardOverview account={account} wrongNetwork={wrongNetwork} networkError={error} onSwitchNetwork={switchToConfiguredNetwork} onStart={startOnboarding} onPayPremium={resumePremiumPayment} onLogout={disconnect} userPolicies={userPolicies} policiesLoading={policiesLoading} policiesError={policiesError} />;
  }

  // --- 5. MAIN DASHBOARD ---
  return (
    <div className="app-shell dashboard-shell">
      <header className="dashboard-topbar">
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={21} /></div>
          <div>
            <div className="brand-name">InsureChain</div>
            <div className="brand-sub">LIVE ZKP PROTOCOL</div>
          </div>
        </div>
        <div className="top-actions">
          <div className="wallet-pill"><Wallet size={15} />{shorten(account)}</div>
          <button className="button button-outline button-small" onClick={() => setDashboardView("overview")}>Dashboard</button>
          <button className="icon-btn" onClick={disconnect}><LogOut size={17} /></button>
        </div>
      </header>

      <main className="dashboard">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">PRODUCTION WORKFLOW</div>
            <h1>Live ZKP Policy Onboarding</h1>
            <p>Input your private metrics to compute zero-knowledge proofs locally and verify them on-chain.</p>
          </div>
          <div className="status-badge">
            {verified ? <Check size={16} /> : <Activity size={16} />}
            {verified ? "Proof Verified" : "Active Session"}
          </div>
        </div>

        <div className="stepper">
          {STEPS.map((item) => {
            const Icon = item.icon;
            const done = item.id < step || (item.id === 4 && verified);
            const active = item.id === step && !verified;
            return (
              <div className="step-wrap" key={item.id}>
                <div className={`step ${done ? "done" : ""} ${active ? "active" : ""}`}>
                  <div className="step-icon">{done ? <Check size={17} /> : <Icon size={17} />}</div>
                  <div><span>STEP {item.id}</span><strong>{item.title}</strong></div>
                </div>
                {item.id < STEPS.length && <ChevronRight className="step-arrow" size={17} />}
              </div>
            );
          })}
        </div>

        {wrongNetwork && <div className="network-warning"><div><strong>MetaMask is on the wrong network</strong><span>Switch to chain ID {configuredChainId} to submit the proof.</span></div><button className="button button-primary button-small" onClick={switchToConfiguredNetwork}>Switch network <ArrowRight size={14}/></button></div>}

        <section className="content-grid">
          <div className="main-panel">
            {step === 1 && (
              <div className="panel-content">
                <h2>{chosenProvider ? `Eligibility demo for ${chosenProvider.name}` : "Choose your life insurance plan"}</h2>
                <p>Select one of the providers and featured plans listed on the dashboard. The choice is attached to your InsureChain eligibility record. Eligibility thresholds are demo inputs; this prototype does not import insurer underwriting rules, submit an application, or purchase coverage.</p>
                <label className="onboarding-label" htmlFor="selected-provider">Life insurance provider and plan</label>
                <select id="selected-provider" className="onboarding-input provider-select" value={selectedProvider} disabled={zkpBusy || Boolean(policyId)} onChange={(event) => {
                  const nextProvider = event.target.value;
                  if (nextProvider !== selectedProvider) {
                    termsAcceptanceRef.current = null;
                  }
                  setSelectedProvider(nextProvider);
                }}>
                  <option value="">Select a provider and plan</option>
                  {INSURANCE_PROVIDERS.map((providerOption) => <option key={providerOption.id} value={providerOption.id}>{providerOption.name} — {providerOption.plan}</option>)}
                </select>
                {chosenProvider && <div className="selected-provider-note"><ShieldCheck size={16} /><span>Selected plan: <strong>{chosenProvider.name} · {chosenProvider.plan}</strong>. The on-chain demo records eligibility thresholds and verification status; it does not buy this insurer’s policy.</span></div>}
                <button className="primary-btn" disabled={!chosenProvider || zkpBusy} onClick={openCustomerDetails}>
                  Enter Customer Details <ArrowRight size={18} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="panel-content">
                <button className="panel-back" onClick={() => setStep(1)}><ArrowLeft size={15}/> Back to policy overview</button>
                <h2>Issuer-signed eligibility credential</h2>
                <p>Choose the credential file issued for your connected wallet. Its signature and active-registry membership are checked inside the zero-knowledge circuit when you submit the proof.</p>
                <section className="declaration-card" aria-labelledby="credential-title">
                  <span className="declaration-kicker">PRIVATE CREDENTIAL</span>
                  <h3 id="credential-title">Select credential JSON</h3>
                  <p>The file contains signed attributes and a Merkle path. The browser uses them as private proof inputs; the contract receives only the eligibility result and policy context.</p>
                  <label className="onboarding-label">Credential file
                    <input className="onboarding-input" type="file" accept="application/json,.json" onChange={handleCredentialFileChange} disabled={zkpBusy} />
                  </label>
                  {credentialFileName && <div className="declaration-note">Selected: {credentialFileName}. Bound wallet: {account ? shorten(account) : "not connected"}.</div>}
                </section>
                <section className="declaration-card" aria-labelledby="threshold-title" style={{ marginTop: 16 }}>
                  <span className="declaration-kicker">PUBLIC POLICY RULES</span>
                  <h3 id="threshold-title">Eligibility thresholds</h3>
                  <p>These policy rules are public and are stored on-chain. The credential values remain private.</p>
                  <div className="declaration-vitals">
                    <label className="onboarding-label">Minimum income (INR)
                      <input className="onboarding-input" name="minIncome" type="number" min="0" step="1" value={formData.minIncome} onChange={handleInputChange} required disabled={zkpBusy} />
                    </label>
                    <label className="onboarding-label">Minimum credit score
                      <input className="onboarding-input" name="minCreditScore" type="number" min="0" max="65535" step="1" value={formData.minCreditScore} onChange={handleInputChange} required disabled={zkpBusy} />
                    </label>
                    <label className="onboarding-label">Maximum medical risk
                      <input className="onboarding-input" name="maxMedicalRisk" type="number" min="0" max="65535" step="1" value={formData.maxMedicalRisk} onChange={handleInputChange} required disabled={zkpBusy} />
                    </label>
                  </div>
                </section>
                <div className="declaration-disclaimer">Demo issuer keys and credentials are for coursework only. The demo issuer does not independently validate income or medical records.</div>
                {realZkpError && <div className="error-box" style={{ marginBottom: 16 }}><X size={16} /><span>{realZkpError}</span></div>}
                <button className="primary-btn" onClick={processDataCollection} disabled={zkpBusy}>
                  Continue with credential <ArrowRight size={18} />
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="panel-content">
                <button className="panel-back" onClick={() => setStep(2)}><ArrowLeft size={15}/> Back to edit details</button>
                <h2>Credential ready for proof generation</h2>
                <p>The proof is generated in your browser after the policy is created. It binds the signed credential to this wallet, policy, current registry root, and policy thresholds.</p>
                
                {zkpHash && (
                  <div className="privacy-callout" style={{ margin: "16px 0" }}>
                    <Fingerprint size={18} />
                    <div>
                      <strong>Proof fingerprint:</strong>
                      <span>{zkpHash}</span>
                    </div>
                  </div>
                )}

                <button className="primary-btn" disabled={zkpBusy || wrongNetwork || !chosenProvider} onClick={openTermsReview}>
                  Review Terms & Submit Proof <ArrowRight size={18} />
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="panel-content">
                <button className="panel-back" disabled={zkpBusy || verified} onClick={() => setStep(3)}><ArrowLeft size={15}/> Back to proof review</button>
                <h2>On-chain Verification</h2>
                <div className={`verification-result ${verified ? "verified" : ""}`}>
                  <div>
                    <strong>{verified ? "ZKP Successfully Verified On-Chain!" : zkpBusy ? "Submitting Policy & Proof Transactions…" : realZkpError ? "Verification needs attention" : "Proof ready to submit"}</strong>
                    <span>{verified ? "Your smart contract verified the Groth16 cryptographic proof directly." : zkpBusy ? "Please approve the transaction in MetaMask when prompted." : realZkpError ? "Review the error below, then retry after correcting the issue." : "Submit the proof to continue."}</span>
                  </div>
                </div>

                {realZkpError && <div className="error-box" style={{ marginTop: 16 }}><X size={16} /><span>{realZkpError}</span></div>}
                
                {zkpHash && (
                  <div className="privacy-callout" style={{ marginTop: 16 }}>
                    <Fingerprint size={18} />
                    <div>
                      <strong>Health & Financial ZKP Hash:</strong>
                      <span>{zkpHash}</span>
                    </div>
                  </div>
                )}

                {policyTxHash && (
                  <div className="privacy-callout" style={{ marginTop: 12 }}>
                    <ExternalLink size={18} />
                    <div>
                      <strong>Policy Creation Tx Hash:</strong>
                      <span>{policyTxHash}</span>
                    </div>
                  </div>
                )}

                {txHash && (
                  <div className="privacy-callout" style={{ marginTop: 12 }}>
                    <ExternalLink size={18} />
                    <div>
                      <strong>Proof Verification Tx Hash:</strong>
                      <span>{txHash}</span>
                    </div>
                  </div>
                )}

                {verified && !premiumPaid && <button className="primary-btn" onClick={() => setShowPaymentModal(true)} disabled={paymentBusy || wrongNetwork} style={{ marginTop: 16 }}>
                  {paymentBusy ? "Recording demo payment..." : "Pay first premium & activate policy"} <ArrowRight size={18} />
                </button>}
                {verified && premiumPaid && <button className="primary-btn" onClick={() => { setDashboardView("overview"); setPoliciesRefreshVersion((version) => version + 1); }} style={{ marginTop: 16 }}>
                  View my policies <ArrowRight size={18} />
                </button>}

                {!verified && (
                  <button className="primary-btn" onClick={generateAndVerifyOnChain} disabled={zkpBusy || wrongNetwork} style={{ marginTop: 16 }}>
                    {zkpBusy ? "Executing On-Chain Tx..." : "Retry Verification"} <ShieldCheck size={18} />
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      {showCustomerDetails && <div className="terms-modal-backdrop customer-details-backdrop" role="presentation">
        <section className="terms-modal customer-details-modal" role="dialog" aria-modal="true" aria-labelledby="customer-details-title">
          <div className="terms-modal-heading"><div><span className="eyebrow section-eyebrow">POLICYHOLDER INFORMATION</span><h2 id="customer-details-title">Customer details</h2><p>These details will be attached to this policy record in this browser.</p></div><button className="terms-modal-close" type="button" aria-label="Close customer details" onClick={() => setShowCustomerDetails(false)}><X size={20}/></button></div>
          <form onSubmit={continueToDataInput}>
            <div className="customer-details-form">
              <div className="customer-details-grid">
                <label className="onboarding-label">Customer name<input className="onboarding-input" name="name" autoComplete="name" value={customerDetails.name} onChange={handleCustomerDetailsChange} required /></label>
                <label className="onboarding-label">Mobile number<input className="onboarding-input" name="mobile" type="tel" inputMode="numeric" autoComplete="tel" maxLength="10" pattern="[0-9]{10}" title="Enter a 10-digit mobile number" value={customerDetails.mobile} onChange={(event) => setCustomerDetails((previous) => ({ ...previous, mobile: event.target.value.replace(/\D/g, "").slice(0, 10) }))} required /></label>
                <label className="onboarding-label">Email ID<input className="onboarding-input" name="email" type="email" autoComplete="email" value={customerDetails.email} onChange={handleCustomerDetailsChange} required /></label>
                <label className="onboarding-label">Aadhaar number<input className="onboarding-input" name="aadhaarNumber" inputMode="numeric" value={customerDetails.aadhaarNumber} onChange={handleCustomerDetailsChange} readOnly={Boolean(loginIdentity.aadhaarNumber)} maxLength="12" pattern="[0-9]{12}" required /></label>
                <label className="onboarding-label">Date of birth<input className="onboarding-input" name="dob" type="date" value={customerDetails.dob} onChange={handleCustomerDetailsChange} readOnly={Boolean(loginIdentity.dob)} required /></label>
                <label className="onboarding-label customer-address-field">Address<textarea className="onboarding-input customer-address-input" name="address" autoComplete="street-address" rows="3" value={customerDetails.address} onChange={handleCustomerDetailsChange} required /></label>
              </div>
              <div className="customer-details-privacy"><LockKeyhole size={16}/><span>Aadhaar, date of birth, and contact details are saved in this browser for dashboard display. They are not written to the policy contract or blockchain.</span></div>
              <div className="terms-modal-actions"><button type="button" className="button button-outline" onClick={() => setShowCustomerDetails(false)}>Cancel</button><button type="submit" className="button button-primary">Continue to Data Input <ArrowRight size={15}/></button></div>
            </div>
          </form>
        </section>
      </div>}
      {showPaymentModal && <div className="terms-modal-backdrop payment-modal-backdrop" role="presentation">
        <section className="terms-modal payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
          <div className="terms-modal-heading"><div><span className="eyebrow section-eyebrow">DEMO PAYMENT GATEWAY</span><h2 id="payment-modal-title">Pay the first premium</h2><p>Policy #{policyId || "?"} - simulated payment only</p></div><button className="terms-modal-close" type="button" aria-label="Close payment dialog" onClick={() => setShowPaymentModal(false)} disabled={paymentBusy}><X size={20}/></button></div>
          <div className="payment-modal-content">
            <div className="payment-amount-row"><span>First premium</span><strong>0.00 <small>DEMO</small></strong></div>
            <div className="customer-details-privacy"><ShieldCheck size={16}/><span>This is a dummy payment. No real payment is collected. MetaMask will ask you to confirm a local transaction that records the demo payment and activates the policy.</span></div>
            {paymentError && <div className="error-box" role="alert"><X size={16}/><span>{paymentError}</span></div>}
            {paymentTxHash && <div className="privacy-callout payment-tx-hash"><ExternalLink size={17}/><div><strong>Demo payment transaction:</strong><span>{paymentTxHash}</span></div></div>}
            <div className="terms-modal-actions"><button type="button" className="button button-outline" onClick={() => setShowPaymentModal(false)} disabled={paymentBusy}>Pay later</button><button type="button" className="button button-primary" onClick={() => payFirstPremium()} disabled={paymentBusy || wrongNetwork || !policyId}>{paymentBusy ? "Confirming demo payment..." : "Pay demo premium & activate"} <ArrowRight size={15}/></button></div>
          </div>
        </section>
      </div>}
      {showTermsModal && chosenProvider && <div className="terms-modal-backdrop" role="presentation">
        <section className="terms-modal" role="dialog" aria-modal="true" aria-labelledby="terms-modal-title">
          <div className="terms-modal-heading"><div><span className="eyebrow section-eyebrow">REQUIRED BEFORE ZKP ACTIVATION</span><h2 id="terms-modal-title">Review {chosenProvider.name} plan terms</h2><p>{chosenProvider.plan} · {chosenProvider.termsVersion}</p></div><button className="terms-modal-close" type="button" aria-label="Close terms" onClick={() => setShowTermsModal(false)}><X size={20}/></button></div>
          <div className="terms-modal-scroll">
            <div className="terms-source-note"><ShieldCheck size={17}/><span>This plan-specific summary is based on the insurer’s published material. Exact benefits, eligibility, exclusions, and charges depend on the option selected and the issued policy schedule. Read the full insurer document before proceeding.</span></div>
            <ol>{chosenProvider.terms.map((term, index) => <li key={`${chosenProvider.id}-terms-${index}`}>{term}</li>)}</ol>
            <a className="terms-source-link" href={chosenProvider.termsSourceUrl} target="_blank" rel="noreferrer">Open the insurer’s official terms source <ExternalLink size={14}/></a>
            <p className="terms-reviewed-date">Summary version {chosenProvider.termsVersion}. Source checked 7 October 2026. Insurer documents can change; the linked contract and policy schedule control.</p>
          </div>
          <div className="terms-modal-acknowledgements">
            <label><input type="checkbox" checked={termsConfirmed} onChange={(event) => setTermsConfirmed(event.target.checked)}/><span>I have reviewed and accept the plan-specific terms summary above.</span></label>
            <label><input type="checkbox" checked={demoNoticeAccepted} onChange={(event) => setDemoNoticeAccepted(event.target.checked)}/><span>I understand this is an InsureChain eligibility demo. This acceptance does not apply for, purchase, issue, or activate insurance coverage with the insurer.</span></label>
            <div className="terms-modal-actions"><button type="button" className="button button-outline" onClick={() => setShowTermsModal(false)}>Review later</button><button type="button" className="button button-primary" disabled={!termsConfirmed || !demoNoticeAccepted || zkpBusy} onClick={acceptTermsAndContinue}>{zkpBusy ? "Submitting…" : "Accept terms & submit proof"} <ArrowRight size={15}/></button></div>
          </div>
        </section>
      </div>}
    </div>
  );
}

export default App;
