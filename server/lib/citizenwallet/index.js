import { loadJSON } from "../utils.js";
import { JsonRpcProvider, Contract, hashMessage } from "ethers";

const erc20Abi = loadJSON("lib/citizenwallet/ERC20.abi.json");
const accountAbi = loadJSON("lib/citizenwallet/Account.abi.json");
const safeAccountAbi = loadJSON("lib/citizenwallet/Safe.abi.json");
const profileContractAbi = loadJSON("lib/citizenwallet/Profile.abi.json");

export const verifyAccountOwnership = async (
  config,
  accountAddress,
  message,
  signature
) => {
  try {
    const rpc = new JsonRpcProvider(config.node.url);
    const contract = new Contract(accountAddress, accountAbi, rpc);

    // Check if isValidSignature is implemented by calling it
    try {
      const hash = hashMessage(message);
      const magicValue = await contract.getFunction("isValidSignature")(
        hash,
        signature
      );

      if (magicValue === "0x1626ba7e") {
        return true;
      }
    } catch (error) {
      console.warn(error);
      // Function is not implemented
      console.warn("isValidSignature is not implemented on this contract");

      const owner = await contract.getFunction("owner")();

      if (owner.toLowerCase() !== accountAddress.toLowerCase()) {
        return false;
      }
    }

    const safeContract = new Contract(accountAddress, safeAccountAbi, rpc);

    const isOwner = await safeContract.getFunction("isOwner")(recoveredAddress);

    return isOwner;
  } catch (error) {
    console.error("Error verifying account ownership:", error);
  }

  return false;
};

export const getAccountBalance = async (config, address) => {
  const rpc = new JsonRpcProvider(config.node.url);
  const contract = new Contract(config.token.address, erc20Abi, rpc);

  try {
    const balance = await contract.getFunction("balanceOf")(address);

    return balance;
  } catch (error) {
    console.error("Error fetching account balance:", error);

    return null;
  }
};

const downloadJsonFromIpfs = async (uri) => {
  let url = uri;
  if (!url.startsWith("http")) {
    const baseUrl = "ipfs.internal.citizenwallet.xyz";

    url = `https://${baseUrl}/${url}`;
  }

  const response = await fetch(url);
  const json = await response.json();

  return json;
};

const formatProfileImageLinks = (ipfsUrl, profile) => {
  if (profile.image_small.startsWith("ipfs://")) {
    profile.image_small = `${ipfsUrl}/${profile.image_small.replace(
      "ipfs://",
      ""
    )}`;
  }

  if (profile.image_medium.startsWith("ipfs://")) {
    profile.image_medium = `${ipfsUrl}/${profile.image_medium.replace(
      "ipfs://",
      ""
    )}`;
  }

  if (profile.image.startsWith("ipfs://")) {
    profile.image = `${ipfsUrl}/${profile.image.replace("ipfs://", "")}`;
  }

  return profile;
};

const getProfileFromId = async (config, id) => {
  const rpc = new JsonRpcProvider(config.node.url);

  const contract = new Contract(
    config.profile.address,
    profileContractAbi,
    rpc
  );

  try {
    const address = await contract.getFunction("fromIdToAddress")(id);

    const uri = await contract.getFunction("tokenURI")(address);

    const profile = await downloadJsonFromIpfs(uri);

    const baseUrl = "ipfs.internal.citizenwallet.xyz";

    return {
      ...formatProfileImageLinks(`https://${baseUrl}`, profile),
      token_id: id,
    };
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

export const getProfileFromAddress = async (config, address) => {
  const rpc = new JsonRpcProvider(config.node.url);

  const contract = new Contract(
    config.profile.address,
    profileContractAbi,
    rpc
  );

  try {
    const id = await contract.getFunction("fromAddressToId")(address);

    return getProfileFromId(config, id.toString());
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

export const loginWithCitizenWallet = async (query) => {
  const { sigAuthAccount, sigAuthExpiry, sigAuthSignature, sigAuthRedirect } =
    query;

  let connectedAccount;
  if (sigAuthAccount && sigAuthExpiry && sigAuthSignature && sigAuthRedirect) {
    try {
      if (new Date().getTime() > new Date(sigAuthExpiry).getTime()) {
        throw new Error("Signature expired");
      }

      const message = `Signature auth for ${sigAuthAccount} with expiry ${sigAuthExpiry} and redirect ${encodeURIComponent(
        sigAuthRedirect
      )}`;

      const isOwner = await verifyAccountOwnership(
        community,
        sigAuthAccount,
        message,
        sigAuthSignature
      );
      if (!isOwner) {
        throw new Error("Invalid signature");
      }
      connectedAccount = sigAuthAccount;
    } catch (e) {
      console.error("Failed to verify signature:", e);
      // You might want to handle this error case appropriately
    }
  }

  if (!connectedAccount) {
    return { profile: null, balance: null };
  }

  const balance = await getAccountBalance(community, connectedAccount);

  const decimals = community.token.decimals;
  const balanceFormatted = Number(balance) / 10 ** decimals;

  const profile = await getProfileFromAddress(community, connectedAccount);

  return { profile, balance: balanceFormatted };
};
