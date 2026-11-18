import { EventData, NavigatedData, Page, WebView } from '@nativescript/core';
import { MLKitView } from '@nativescript/mlkit-core';
import { HomeViewModel } from './home-view-model';

// Se crea un solo view model por página, aunque se vuelva a navegar a ella
export function navigatingTo(args: NavigatedData) {
  const page = <Page>args.object;
  if (!page.bindingContext) page.bindingContext = new HomeViewModel();
}

export function onLoaded(args: EventData) {
  const page = <Page>args.object;
  const vm = page.bindingContext as HomeViewModel;
  vm.conectarMapa(page.getViewById<WebView>('mapa'));
  vm.conectarCamara(page.getViewById<MLKitView>('camara'));
}

// Al salir de la vista se apagan cámara, GPS y timers
export function onUnloaded(args: EventData) {
  const vm = (<Page>args.object).bindingContext as HomeViewModel;
  if (vm) vm.liberar();
}
