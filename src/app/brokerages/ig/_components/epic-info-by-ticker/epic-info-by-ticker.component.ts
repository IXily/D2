/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { FormsModule } from '@angular/forms';

import litClient from "src/app/scripts/Lit";

import { isNullOrUndefined } from 'src/app/helpers/helpers';

import { NFTCredentialService } from 'src/app/services/nft-credential.service';

import * as litActions from 'src/app/scripts/lit-actions';
import { Subject, debounceTime } from 'rxjs';


@Component({
  selector: 'app-ig-epic-info-by-ticker',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './epic-info-by-ticker.component.html',
  styleUrls: ['./epic-info-by-ticker.component.scss'],
})
export default class AppIgEpicInfoByTickerComponent implements OnInit {

  @Input() uuid: string = null as any;
  @Input() accountSelected: any = null;

  credentials: any;
  isLoading: boolean;
  isLoadingCredentials = false as boolean;
  broker = 'IG';

  symbolToSearch = null;
  symbolToSearchSub = new Subject<any>();

  igAssets: any[] = [];
  epic: string;
  assetInfo = null;

  authInfo: {
    apiKey: string,
    cst: string,
    securityToken: string,
  } = {
      apiKey: null as any,
      cst: null as any,
      securityToken: null as any,
    };

  env: 'demo' | 'prod' = null as any;

  @Output() changed = new EventEmitter<{
    igAssetInfo: any,
  }>();

  constructor(
    private nftCredentialService: NFTCredentialService,
    public cRef: ChangeDetectorRef
  ) {
    this.epic = null as any;
    this.isLoading = false;
  }

  async ngOnInit() {
    this.symbolToSearchSub.pipe(debounceTime(1000)).subscribe(async (e: any) => {
      const symbol = e?.target?.value?.trim()?.toUpperCase() || null;

      if (symbol) {

        this.epic = null as any;
        this.assetInfo = null as any;
        this.igAssets = [];
        this.cRef.detectChanges();

        this.symbolToSearch = symbol?.toUpperCase();
        this.credentials = null;
        await this.igSearchAsset();
      }
    });
  }

  async igSearchAsset() {
    try {

      this.isLoading = true;
      await this.decrypt();

      if (
        !isNullOrUndefined(this.credentials?.username) &&
        !isNullOrUndefined(this.credentials?.password) &&
        !isNullOrUndefined(this.credentials?.apiKey)
      ) {
        this.env = this.credentials?.env || this?.credentials?.environment || 'demo';
        const litActionCodeA = litActions.ig.checkCredentials(this.env);
        // console.log('litActionCodeA', litActionCodeA);

        const listActionCodeParamsA = {
          credentials: this.credentials,
          form: {}
        };

        const litActionCallA = await litClient.runLitAction({
          chain: await this.nftCredentialService.getChain(),
          litActionCode: litActionCodeA,
          listActionCodeParams: listActionCodeParamsA,
          nodes: 1,
          showLogs: true,
        });

        const responseA = litActionCallA?.response as any;

        this.authInfo = {
          apiKey: this.credentials?.apiKey,
          cst: responseA?.clientSessionToken,
          securityToken: responseA?.activeAccountSessionToken,
        };

        const litActionCodeB = litActions.ig.getAssetsBySymbol(
          this.env,
          this.symbolToSearch as any,
          this.authInfo,
        );

        const litActionCallB = await litClient.runLitAction({
          chain: await this.nftCredentialService.getChain(),
          litActionCode: litActionCodeB,
          listActionCodeParams: {},
          nodes: 1,
          showLogs: true,
        });

        const responseB = litActionCallB?.response as any;

        this.igAssets = responseB || [];
        // console.log('this.igAssets', this.igAssets);

        this.cRef.detectChanges();
      }

      this.isLoading = false;

    } catch (err: any) {
      this.isLoading = false;
    }
  }

  async getMarketInfoByEpic() {

    let response = null as any;

    try {

      this.isLoading = true;

      const litActionCode = litActions.ig.getMarketInfoByEpic(
        this.env,
        this.epic as any,
        this.authInfo,
      );

      const litActionCall = await litClient.runLitAction({
        chain: await this.nftCredentialService.getChain(),
        litActionCode: litActionCode,
        listActionCodeParams: {},
        nodes: 1,
        showLogs: true,
      });

      response = litActionCall?.response as any;

      this.cRef.detectChanges();

      this.isLoading = false;

    } catch (err: any) {
      this.isLoading = false;
    }

    return response;
  }


  async decrypt(
    credentialInfo: any = null
  ) {
    try {
      if (!isNullOrUndefined(this.uuid)) {

        if (isNullOrUndefined(credentialInfo)) {
          credentialInfo = await this.nftCredentialService.getCredentialByUUID(this.uuid);
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

  async selectAssetInfo(assetInfo: any) {
    this.assetInfo = assetInfo;
    this.epic = assetInfo?.epic || null;

    const marketInfo = await this.getMarketInfoByEpic();

    this.changed.emit({
      igAssetInfo: {
        ...assetInfo,
        marketInfo,
      },
    });

    this.cRef.detectChanges();
  }
}
