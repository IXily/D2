/* generated by https://transform.tools/json-to-typescript */

export interface IAccount {
    accountId: string
    accountName: string
    accountAlias: any
    status: string
    accountType: string
    preferred: boolean
    balance: Balance
    currency: string
    canTransferFrom: boolean
    canTransferTo: boolean
}

export interface Balance {
    balance: number
    deposit: number
    profitLoss: number
    available: number
}

/* generated by https://transform.tools/json-to-typescript */

/*
{
    "accountId": "XNMWC",
    "accountName": "Demo-SpreadBet",
    "accountAlias": null,
    "status": "ENABLED",
    "accountType": "SPREADBET",
    "preferred": true,
    "balance": {
        "balance": 6733770,
        "deposit": 205261.94,
        "profitLoss": -1325.73,
        "available": 6527182
    },
    "currency": "GBP",
    "canTransferFrom": true,
    "canTransferTo": true
}
*/
