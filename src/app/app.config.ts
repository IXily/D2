import { ApplicationConfig, importProvidersFrom, } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { HIGHLIGHT_OPTIONS } from 'ngx-highlightjs';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      FormsModule,
      BrowserModule,
      BrowserAnimationsModule,
    ),
    provideHttpClient(),
    provideRouter(routes, withComponentInputBinding()),
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: {
        fullLibraryLoader: () => import('highlight.js')
      }
    },
  ],
};
