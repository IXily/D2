import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WeaveDBService } from 'src/app/services/weavedb.service';

import { NFTCredentialService } from 'src/app/services/nft-credential.service';
import { PKPGeneratorService } from 'src/app/services/pkp-generator.service';
import { FormsModule } from '@angular/forms';
import { getDefaultAccount } from 'src/app/shared/shared';

// import { EventService } from 'src/app/services/event.service';
// import { ActivService } from 'src/app/services/activ.service';
// import { v4 } from '@ixily/activ-web';

@Component({
  selector: 'app-trigger-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './trigger-view.component.html',
  styleUrls: ['./trigger-view.component.scss'],
})
export default class TriggerViewComponent implements OnInit {

  currentOption = 'trigger-view';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger: any;
  isLoading = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  account: any;
  triggerId: string;

  maxLeverageIsEdit = signal(false);
  maxPositionSizeIsEdit = signal(false);
  orderSizeIsEdit = signal(false);
  portfolioSlippageIsEdit = signal(false);

  chatIdIsEdit = signal(false);
  chatTokenIsEdit = signal(false);
  threadIdIsEdit = signal(false);

  slackWebhookIsEdit = signal(false);

  handleIsEdit = signal(false);
  appKeyIsEdit = signal(false);
  appSecretIsEdit = signal(false);
  accessTokenIsEdit = signal(false);
  accessSecretIsEdit = signal(false);

  isFullEdit = computed(() => {
    return this.maxLeverageIsEdit() && this.maxPositionSizeIsEdit() && this.orderSizeIsEdit();
  });

  isTelegramEdit = computed(() => {
    return this.chatIdIsEdit() && this.chatTokenIsEdit() && this.threadIdIsEdit();
  });

  isSlackEdit = computed(() => {
    return this.slackWebhookIsEdit();
  });

  isTwitterEdit = computed(() => {
    return this.handleIsEdit() && this.appKeyIsEdit() && this.appSecretIsEdit() && this.accessTokenIsEdit() && this.accessSecretIsEdit();
  });

  constructor(
    private route: ActivatedRoute,
    private weaveDBService: WeaveDBService,
    private nftCredentialService: NFTCredentialService,
    private pKPGeneratorService: PKPGeneratorService,
  ) {
    this.trigger = {};
    this.account = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.triggerId = null as any;
  }

  async ngOnInit() {
    // console.log('this.route.snapshot.params', this.route.snapshot.params);
    this.triggerId = this.route.snapshot.params['id'];
    await this.getTriggerSingle();
  }

  async getTriggerSingle() {
    this.isLoading = true;

    try {
      if (this.triggerId.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.trigger = await this.weaveDBService.getDataByDocID<any>(this.triggerId);

        // supplement with the account details 
        if (this.trigger.account?.reference) {
          await this.getAccount(this.trigger.account?.reference);
        }
      }
    } catch (err) {
      // console.log('get trigger error', err);
    }

    this.isLoading = false;
  }

  async getAccount(accountReference: string) {
    try {

      const { pkpWalletAddress } = await this.pKPGeneratorService.getOrGenerateAutoPKPInfo({
        autoRedirect: true,
      });
      const accounts = await this.nftCredentialService.getMyCredentials(pkpWalletAddress);
      // console.log('accoubts', accounts);

      for (const i in accounts) {
        if (i) {
          if (accountReference === accounts[i].uuid) {
            this.account = accounts[i];
            // console.log('this.account', this.account);
            break;
          }
        }
      }
    } catch (err) {
      // console.log(err.message);
    }
    this.isLoading = false;
  }

  setEditable(field: string) {
    // Copy Trade
    if (field === 'maxLeverage') {
      this.maxLeverageIsEdit.set(!this.maxLeverageIsEdit());
    }
    if (field === 'maxPositionSize') {
      this.maxPositionSizeIsEdit.set(!this.maxPositionSizeIsEdit());
    }
    if (field === 'orderSize') {
      this.orderSizeIsEdit.set(!this.orderSizeIsEdit());
    }
    if (field === 'portfolioSlippage') {
      this.portfolioSlippageIsEdit.set(!this.portfolioSlippageIsEdit());
    }

    // Telegram Notifications
    if (field === 'chatId') {
      this.chatIdIsEdit.set(!this.chatIdIsEdit());
    }
    if (field === 'chatToken') {
      this.chatTokenIsEdit.set(!this.chatTokenIsEdit());
    }
    if (field === 'threadId') {
      this.threadIdIsEdit.set(!this.threadIdIsEdit());
    }

    // Slack
    if (field === 'slackWebhook') {
      this.slackWebhookIsEdit.set(!this.slackWebhookIsEdit());
    }

    // Twitter
    if (field === 'handle') {
      this.handleIsEdit.set(!this.handleIsEdit());
    }
    if (field === 'appKey') {
      this.appKeyIsEdit.set(!this.appKeyIsEdit());
    }
    if (field === 'appSecret') {
      this.appSecretIsEdit.set(!this.appSecretIsEdit());
    }
    if (field === 'accessToken') {
      this.accessTokenIsEdit.set(!this.accessTokenIsEdit());
    }
    if (field === 'accessSecret') {
      this.accessSecretIsEdit.set(!this.accessSecretIsEdit());
    }
  }

  async updateTrigger() {

    const userWallet = await getDefaultAccount();

    const { pkpPublicKey } = await this.pKPGeneratorService.getOrGenerateAutoPKPInfo({
      autoRedirect: true,
    });

    const docId = this.trigger.docId;

    const triggerInfo = {
      ...this.trigger,
    };
    // console.log('triggerInfo', triggerInfo);

    delete triggerInfo.docId;

    await this.weaveDBService.upsertData({
      pkpKey: pkpPublicKey,
      type: 'trigger',
      userWallet,
      jsonData: triggerInfo,
      isCompressed: false,
      docId,
    });

    this.maxLeverageIsEdit.set(false);
    this.maxPositionSizeIsEdit.set(false);
    this.orderSizeIsEdit.set(false);
    this.portfolioSlippageIsEdit.set(false);

    this.chatIdIsEdit.set(false);
    this.chatTokenIsEdit.set(false);
    this.threadIdIsEdit.set(false);

    this.slackWebhookIsEdit.set(false);

    this.handleIsEdit.set(false);
    this.appKeyIsEdit.set(false);
    this.appSecretIsEdit.set(false);
    this.accessTokenIsEdit.set(false);
    this.accessSecretIsEdit.set(false);

  }
}
