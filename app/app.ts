import { Application } from '@nativescript/core';
// Se importa aquí para que en iOS el plugin registre a tiempo su "delegate" de notificaciones
import '@nativescript/local-notifications';

Application.run({ moduleName: 'app-root' });

/*
Do not place any code after the application has been started as it will not
be executed on iOS.
*/
