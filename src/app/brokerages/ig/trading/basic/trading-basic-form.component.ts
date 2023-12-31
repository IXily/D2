/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { FormsModule } from '@angular/forms';

// https://www.kraken.com/convert

import { EventService, EventType } from 'src/app/services/event.service';

import litClient from "src/app/scripts/Lit";

import { isNullOrUndefined } from 'src/app/helpers/helpers';

import { NFTCredentialService } from 'src/app/services/nft-credential.service';

import * as litActions from 'src/app/scripts/lit-actions';
import { PKPGeneratorService } from 'src/app/services/pkp-generator.service';
import { Subject } from 'rxjs';
import AppIgEpicInfoByTickerComponent from '../../_components/epic-info-by-ticker/epic-info-by-ticker.component';
import { IAccount } from '../../_interfaces/account.i';

interface FormType {
  credentialNftUuid: string;
  broker: string;
  environment: string;
  asset: string;
  expiry: string,
  direction: string;
  quantity: number;
}

@Component({
  selector: 'app-trading-basic-ig-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    AppIgEpicInfoByTickerComponent,
  ],
  templateUrl: './trading-basic-form.component.html',
  styleUrls: ['./trading-basic-form.component.scss'],
})
export default class TradingBasicIGFormComponent implements OnInit {
  form: FormType;
  submitEnabled: boolean;
  credentials: any;
  allAccounts: any[];
  isLoading: boolean;
  isLoadingCredentials = false as boolean;
  broker = 'IG';

  accountSelected = null;

  symbolToSearch = null;
  symbolToSearchSub = new Subject<any>();

  epic: string;
  expiry: string;
  assetInfo = null;

  accountId: string = null as any;

  constructor(
    private eventService: EventService,
    private nftCredentialService: NFTCredentialService,
    private pKPGeneratorService: PKPGeneratorService,
    public cRef: ChangeDetectorRef
  ) {
    this.epic = null as any;
    this.expiry = '' as any;
    this.isLoading = false;
    this.allAccounts = [];
    this.form = {
      credentialNftUuid: '',
      broker: '',
      environment: 'prod',
      asset: '',
      expiry: '',
      direction: 'buy',
      quantity: 1,
    };
    this.submitEnabled = false;
  }

  async ngOnInit() {
    await this.getCredentials();
    this.callEvents();
  }

  async getCredentials() {
    this.isLoadingCredentials = true;
    const { pkpWalletAddress } = await this.pKPGeneratorService.getOrGenerateAutoPKPInfo({
      autoRedirect: true,
    });
    this.allAccounts = await this.nftCredentialService.getMyCredentials(pkpWalletAddress);
    this.allAccounts = this.allAccounts.filter(res => res.provider === this.broker);
    this.isLoadingCredentials = false;
  }

  async requiredControl(valueChanged?: string) {

    const credentialNftUuid = this.form.credentialNftUuid;
    const account = this.allAccounts?.find(res => res.uuid === credentialNftUuid);

    if (account) {
      this.accountSelected = account;
      this.form.broker = account.provider;
      this.form.environment = account.environment;
      this.cRef.detectChanges();
    }

    if (valueChanged === 'credential') {
      await this.decrypt();
      this.accountId = this.credentials.accountId;
    }

    if (!isNullOrUndefined(this.epic)) {
      this.form.asset = this.epic;
    }

    if (
      this.form.broker.length > 0 &&
      this.form.asset.length > 0 &&
      this.form.direction.length > 0 &&
      this.form.expiry.length > 0 &&
      this.form.quantity > 0
    ) {
      this.submitEnabled = true;
    } else {
      this.submitEnabled = false;
    }
  }

  submit = async () => {
    await this.igPlaceOrder();
  };

  async igPlaceOrder() {
    try {

      this.isLoading = true;

      if (
        !isNullOrUndefined(this.credentials?.username) &&
        !isNullOrUndefined(this.credentials?.password) &&
        !isNullOrUndefined(this.credentials?.apiKey)
      ) {

        const env: 'demo' | 'prod' = this.form.environment as any;
        const litActionCodeA = litActions.ig.checkCredentials(env);

        const listActionCodeParamsA = {
          credentials: this.credentials,
          form: this.form,
        };

        const litActionCallA = await litClient.runLitAction({
          chain: await this.nftCredentialService.getChain(),
          litActionCode: litActionCodeA,
          listActionCodeParams: listActionCodeParamsA,
          nodes: 1,
          showLogs: true,
        });

        const responseA = litActionCallA?.response as any;

        const auth = {
          apiKey: this.credentials?.apiKey,
          cst: responseA?.clientSessionToken,
          securityToken: responseA?.activeAccountSessionToken,
        };

        /* accounts */
        const litActionCodeB = litActions.ig.getAccounts(
          env,
          auth,
        );

        const litActionCallB = await litClient.runLitAction({
          chain: await this.nftCredentialService.getChain(),
          litActionCode: litActionCodeB,
          listActionCodeParams: {},
          nodes: 1,
          showLogs: true,
        });

        const responseB = litActionCallB?.response as any;

        const account: IAccount = responseB?.find((res: any) => res.accountId === this.accountId);

        const litActionCodeC = litActions.ig.placeOrder(
          env,
          {
            direction: this.form.direction,
            epic: this.form.asset,
            expiry: this.form.expiry,
            quantity: this.form.quantity,
            currencyCode: account.currency,
          },
          auth,
        );

        const litActionCallC = await litClient.runLitAction({
          chain: await this.nftCredentialService.getChain(),
          litActionCode: litActionCodeC,
          listActionCodeParams: {},
          nodes: 1,
          showLogs: true,
        });

        const responseC = litActionCallC?.response as any;

        const orderId = responseC?.dealId || null;

        if (responseB?.errorCode) {
          alert(responseB?.errorCode);
        }

        if (orderId) {
          alert(`Order placed successfully. OrderID: ${orderId}`);
        }

        this.cRef.detectChanges();

      }

      this.isLoading = false;

    } catch (err: any) {
      this.isLoading = false;
    }
  }

  async decrypt(
    credentialInfo: any = null
  ) {
    try {
      if (!isNullOrUndefined(this.form.credentialNftUuid)) {

        const uuid = this.form.credentialNftUuid;

        if (isNullOrUndefined(credentialInfo)) {
          credentialInfo = await this.nftCredentialService.getCredentialByUUID(uuid);
        }

        const encryptedFileB64 =
          credentialInfo?.encryptedCredential?.encryptedFileB64;
        const encryptedSymmetricKeyString =
          credentialInfo?.encryptedCredential?.encryptedSymmetricKeyString;

        const accessControlConditionsNFT = [
          {
            contractAddress: await this.nftCredentialService.getContractAddress(),
            standardContractType: 'ERC1155',
            method: 'balanceOf',
            parameters: [':userAddress', credentialInfo?.tokenId?.toString()],
            returnValueTest: {
              comparator: '>',
              value: '0',
            },
            chain: await this.nftCredentialService.getChain(),
          },
        ];

        const decryptedFile = await litClient.decryptString(
          encryptedFileB64,
          encryptedSymmetricKeyString,
          accessControlConditionsNFT
        );

        if (!isNullOrUndefined(decryptedFile)) {
          this.credentials = JSON.parse(decryptedFile);
        }
      }
    } catch (err: any) {
      console.log('decrypt (error)', err?.message);
      alert(`You don't have access to this credential`);
    }
  }

  callEvents = () => {
    this.eventService.listen().subscribe(async (res: any) => {
      const event = res.type as EventType;
      const data = res?.data || null;

      switch (event) {
        case 'TO_BASIC':
          console.log('data', data)
          this.form = {
            credentialNftUuid: data.uuid,
            broker: this.form.broker,
            environment: this.form.environment,
            asset: data.asset,
            expiry: data.expiry,
            direction: 'buy',
            quantity: 1,
          }
          break;
      }
    });
  };

  getIgEpic = ({ igAssetInfo }: any) => {
    this.assetInfo = igAssetInfo;
    console.log('this.assetInfo', this.assetInfo);
    this.epic = igAssetInfo?.epic || null;
    this.form.asset = this.epic;
    this.form.expiry = this.epic;
    this.requiredControl();
    this.cRef.detectChanges();
  };

}
