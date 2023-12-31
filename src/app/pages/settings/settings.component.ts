import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { EventService } from 'src/app/services/event.service';
import NavbarAuthComponent from 'src/app/components/navbar-auth/navbar-auth.component';
import LeftMenuComponent from 'src/app/components/left-menu/left-menu.component';

import { FormsModule } from '@angular/forms';
import { WeaveDBService } from 'src/app/services/weavedb.service';
import { getDefaultAccount } from 'src/app/shared/shared';

import { PKPGeneratorService } from 'src/app/services/pkp-generator.service';
import { copyValue, wait } from 'src/app/helpers/helpers';

const litPkpUrl = 'https://explorer.litprotocol.com/pkps';

import { environment } from '../../../environments/environment';

interface FormType {
    proxy_url: string;
    croupier_url: string;
    event_listener_url: string;
}

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,

        NavbarAuthComponent,
        LeftMenuComponent,
        FormsModule,
    ],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss']
})
export default class SettingsComponent implements OnInit {

    form: FormType;
    currentOption: string;
    isLoading = false;
    formIsLoading = false;
    submitEnabled = false;
    settingsDocId: string;
    defaultProxyUrl = environment.defaultProxyUrl;
    defaultProxyIp = environment.defaultProxyIp;
    defaultCroupierUrl = environment.defaultCroupierUrl;
    defaultEventListenerUrl = environment.defaultEventListenerUrl;
    pkpInfoDocId: string;

    pkpInfo: any;

    walletAddressToAddAccess: string;
    walletsWithAccess: any[];

    pkpLoading: boolean;

    constructor(
        private router: Router,
        private weaveDBService: WeaveDBService,
        private pKPGeneratorService: PKPGeneratorService,
        private cRef: ChangeDetectorRef,
    ) {
        this.pkpLoading = false;
        this.walletAddressToAddAccess = null as any;
        this.pkpInfo = null as any;
        this.settingsDocId = undefined as any;
        this.pkpInfoDocId = undefined as any;
        this.currentOption = 'settings';

        this.form = {
            proxy_url: environment.defaultProxyUrl,
            croupier_url: environment.defaultCroupierUrl,
            event_listener_url: environment.defaultEventListenerUrl,
        };
        this.walletsWithAccess = [];
        this.requiredControl();
    }

    async ngOnInit() {
        await this.getSettings();
    }

    requiredControl = (): void => {
        if (
            this.form.proxy_url.length > 0 &&
            this.form.croupier_url.length > 0
        ) {
            this.submitEnabled = true;
        } else {
            this.submitEnabled = false;
        }
    };

    async restoreDefaultProxy() {
        this.form.proxy_url = environment.defaultProxyUrl;
        this.requiredControl();
        this.cRef.detectChanges();
    }

    async restoreDefaultCroupier() {
        this.form.croupier_url = environment.defaultCroupierUrl;
        this.requiredControl();
        this.cRef.detectChanges();
    }

    async restoreDefaultEventListener() {
        this.form.event_listener_url = environment.defaultEventListenerUrl;
        this.requiredControl();
        this.cRef.detectChanges();
    }

    async getSettings() {
        this.isLoading = true;

        let settings = await this.weaveDBService.getAllData<any>({
            type: 'setting',
        });

        let data = settings?.data;

        const { pkpWalletAddress } = await this.pKPGeneratorService.getOrGenerateAutoPKPInfo({
            autoRedirect: true,
        });

        data = data?.filter((s) => {
            const check = s?.pkpWalletAddress?.toLowerCase() === pkpWalletAddress?.toLowerCase();
            return check;
        });

        if (data?.length > 0) {
            this.settingsDocId =
                data[0]?.docId;

            this.form.croupier_url =
                data[0]?.croupier_url || environment.defaultCroupierUrl;

            this.form.proxy_url =
                data[0]?.proxy_url || environment.defaultProxyUrl;

            this.form.event_listener_url =
                data[0]?.event_listener_url || environment.defaultEventListenerUrl;
        }

        this.isLoading = false;
    }

    async submit() {
        this.formIsLoading = true;
        try {
            const userWallet = await getDefaultAccount();

            const pkpInfo = await this.pKPGeneratorService.getOrGenerateAutoPKPInfo({
                autoRedirect: true,
            });

            const pkpKey = pkpInfo?.pkpPublicKey;

            await this.weaveDBService.upsertData({
                type: 'setting',
                jsonData: this.form,
                userWallet,
                docId: this.settingsDocId,
                isCompressed: false,
                pkpKey,
            });

            window.location.reload();

            this.formIsLoading = false;
        } catch (err) {
            this.formIsLoading = false;
        }
    }

    resetLitAuth() {
        localStorage.removeItem('lit-web3-provider');
        localStorage.removeItem('lit-comms-keypair');
        localStorage.removeItem('lit-auth-signature');
        window.location.reload();
    }

}