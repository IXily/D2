import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SDK, CONTRACT } from '@ixily/activ-web';
import v4 = SDK.v4;
import CI = CONTRACT.CONTRACT_INTERFACES;
import { ActivService } from 'src/app/services/activ.service';
import { NFTCredentialService } from 'src/app/services/nft-credential.service';
import { WeaveDBService } from 'src/app/services/weavedb.service';
import { getDefaultAccount } from 'src/app/shared/shared';

import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { isNullOrUndefined } from 'src/app/helpers/helpers';
import { PKPGeneratorService } from 'src/app/services/pkp-generator.service';
import { ShortenContractAddress } from 'src/app/pipes/shorten-contract-address.pipe';

// import { EventService } from 'src/app/services/event.service';
// import { ActivService } from 'src/app/services/activ.service';
// import { v4 } from '@ixily/activ-web';

@Component({
  selector: 'app-triggers-create',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, ShortenContractAddress],
  templateUrl: './triggers-create.component.html',
  styleUrls: ['./triggers-create.component.scss'],
})
export default class TriggersCreateComponent implements OnInit {
  stage = 1;
  strategies = [] as CI.ITradeIdeaStrategy[];
  isLoading = false;
  currentStrategy: any;

  allAccounts: any[];

  actions = [
    {
      option: 'telegram-notification',
      label: 'Telegram Notification',
    },
    {
      option: 'copy-trade',
      label: 'Copy Trade',
    },
  ];

  form: FormGroup = new FormGroup({
    action: new FormControl(null),
    strategy: new FormControl(null),

    // copy trade
    account: new FormControl(null),
    maximumLeverage: new FormControl(''),
    defaultOrderSize: new FormControl(''),
    maxSizePortofolio: new FormControl(''),

    // telegram
    chatId: new FormControl(''),
    chatToken: new FormControl(''),
    threadId: new FormControl(''),
  });

  constructor(
    private router: Router,
    private weaveDBService: WeaveDBService,
    private activService: ActivService,
    private nftCredentialService: NFTCredentialService,
    private pkpGeneratorService: PKPGeneratorService,
    private formBuilder: FormBuilder
  ) {
    this.allAccounts = [];
  }

  async ngOnInit() {
    await Promise.all([this.getStrategies(), this.getAccounts()]);

    this.form = this.formBuilder.group({
      action: ['', Validators.required],
      strategy: ['', Validators.required],

      // copy trade
      account: ['', Validators.required],
      maximumLeverage: ['', Validators.required],
      defaultOrderSize: ['', Validators.required],
      maxSizePortofolio: ['', Validators.required],

      // telegram
      chatId: ['', Validators.required],
      chatToken: ['', Validators.required],
      threadId: ['', Validators.required],
    });
  }

  setAction() {
    if (this.form.get('action')?.valid) {
      this.stage = 2;
    }
  }

  setStrategy() {
    if (this.form.get('strategy')?.valid) {

      this.currentStrategy = this.strategies.find(
        (s) => s.reference === this.form.value.strategy
      );
      // console.log('this.currentStrategy', this.currentStrategy);

      // if this is a copy trade, then we need to set the account
      switch (this.form.value.action) {
        case 'copy-trade':
          this.stage = 3;
          break;
        case 'telegram-notification':
          this.stage = 30;
          break;  
      }      

    }
  }

  setAccountCopyTrade() {
    if (this.form.get('account')?.valid) {
      this.stage = 4;
    }
  }

  async setSettingsCopyTrade() {
    if (this.form.valid) {
      const userWallet = await getDefaultAccount();

      const strategy = this.strategies.find(
        (s) => s.reference === this.form.value.strategy
      );

      const account: any = this.allAccounts.find(
        (a) => a.uuid === this.form.value.account
      );

      if (!isNullOrUndefined(strategy) && !isNullOrUndefined(account)) {
        const { pkpPublicKey } = await this.pkpGeneratorService.getOrGenerateAutoPKPInfo({
          autoRedirect: true,
        });

        await this.weaveDBService.upsertData({
          pkpKey: pkpPublicKey,
          type: 'trigger',
          userWallet,
          jsonData: {
            action: this.form.value.action,
            strategy: {
              reference: strategy?.reference,
              name: strategy?.name,
            },
            account: {
              reference: account.uuid,
            },
            settings: {
              maxLeverage: this.form.value.maximumLeverage,
              orderSize: this.form.value.defaultOrderSize,
              maxPositionSize: this.form.value.maxSizePortofolio,
            },
          },
          isCompressed: false,
        });

        this.stage = 5;

        this.router.navigateByUrl('/triggers');
      }
    }
  }

  async setSettingsTelegram() {
    console.log('test pre form valid check');
    if (this.form.valid) {
      const userWallet = await getDefaultAccount();
      // console.log('submit the form A', userWallet);

      const strategy = this.strategies.find(
        (s) => s.reference === this.form.value.strategy
      );
      // console.log('submit the form B', strategy);
    
      if (!isNullOrUndefined(strategy) && !isNullOrUndefined(this.form.value.chatId) && !isNullOrUndefined(this.form.value.chatToken)) {
        // console.log('submit the form')
        const { pkpPublicKey } = await this.pkpGeneratorService.getOrGenerateAutoPKPInfo({
          autoRedirect: true,
        });

        await this.weaveDBService.upsertData({
          pkpKey: pkpPublicKey,
          type: 'trigger',
          userWallet,
          jsonData: {
            action: this.form.value.action,
            strategy: {
              reference: strategy?.reference,
              name: strategy?.name,
            },
            settings: {
              chatId: this.form.value.chatId,
              chatToken: this.form.value.chatToken,
              threadId: this.form.value.threadId,
            },
          },
          isCompressed: false,
        });

        this.stage = 5;

        this.router.navigateByUrl('/triggers');
      }
    }    
  }



  goBack() {
    // set our new action here
    if (this.stage > 10) {
      this.stage = 2;
    } else {
      this.stage = this.stage - 1;
    }
  }

  goToSection(section: number) {
    // set our new action here
    this.stage = section;
  }

  async getStrategies() {
    this.isLoading = true;
    // strategies the user has explicit access to
    this.strategies = await this.activService.listMyStrategies();
    // console.log('allStrategies', this.strategies);
    this.isLoading = false;
  }

  async getAccounts() {
    this.isLoading = true;
    const { pkpWalletAddress } =
      await this.pkpGeneratorService.getOrGenerateAutoPKPInfo({
        autoRedirect: true,
      });
    this.allAccounts = await this.nftCredentialService.getMyCredentials(
      pkpWalletAddress
    );
    console.log('allAccounts', this.allAccounts);
    this.isLoading = false;
  }

  submitForm() {
    if (this.form.invalid) {
    }
  }
}
