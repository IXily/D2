import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { EventService, EventType } from 'src/app/services/event.service';
import NavbarAuthComponent from 'src/app/components/navbar-auth/navbar-auth.component';
import LeftMenuComponent from 'src/app/components/left-menu/left-menu.component';

import { FormsModule } from '@angular/forms';
import { WeaveDBService } from 'src/app/services/weavedb.service';
import { getDefaultAccount } from 'src/app/shared/shared';

import { pkpKey } from 'src/app/constants/constants';
import { PKPGeneratorService } from 'src/app/services/pkp-generator.service';

interface FormType {
    proxy_url: string;
    croupier_url: string;
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

    defaultProxy = {
        url: 'https://ixily.io/api/proxy',
        ip: '35.189.88.222',
    }

    defaultCroupier = {
        url: 'https://croupier.ixily.io',
    }

    settingsDocId: string;

    pkpInfo: any;

    constructor(
        private router: Router,
        private eventService: EventService,
        private weaveDBService: WeaveDBService,
        private cRef: ChangeDetectorRef,
        private pKPGeneratorService: PKPGeneratorService,
    ) {
        this.pkpInfo = null as any;
        this.settingsDocId = undefined as any;
        this.currentOption = 'settings';
        this.form = {
            proxy_url: this.defaultProxy.url,
            croupier_url: this.defaultCroupier.url,
        };
        this.requiredControl();
    }

    async ngOnInit() {
        this.getSettings();
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
        this.form.proxy_url = this.defaultProxy.url;
        this.requiredControl();
        this.cRef.detectChanges();
    }

    async restoreDefaultCroupier() {
        this.form.croupier_url = this.defaultCroupier.url;
        this.requiredControl();
        this.cRef.detectChanges();
    }

    async getSettings() {
        this.isLoading = true;

        const data = await this.weaveDBService.getAllData<any>({
            type: 'setting',
        });

        if (data?.length > 0) {
            this.form.croupier_url = data[0]?.croupier_url;
            this.form.proxy_url = data[0]?.proxy_url;
            this.settingsDocId = data[0]?.docId;
        }

        this.isLoading = false;
    }

    async submit() {
        this.formIsLoading = true;
        try {
            const userWallet = await getDefaultAccount();

            await this.weaveDBService.upsertData({
                type: 'setting',
                jsonData: this.form,
                userWallet,
                docId: this.settingsDocId,
                isCompressed: false,
                pkpKey,
            });

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

    goToPage = (option: string): void => {
        if (option === 'proxy-guide') {
            this.router.navigateByUrl('guides/proxy-service');
        }
    }

    async generatePkp() {
        const mint = await this.pKPGeneratorService.mint();

        const userWallet = await getDefaultAccount();

        await this.weaveDBService.upsertData({
            type: 'pkp-info',
            jsonData: mint,
            userWallet,
            isCompressed: false,
            pkpKey: mint.pkpPublicKey,
        });

        this.pkpInfo = mint;

        this.pkpInfo.url = `https://explorer.litprotocol.com/pkps/${mint.tokenId}`;
    }

}