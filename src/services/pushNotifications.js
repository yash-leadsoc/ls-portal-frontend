import { api } from '../api/client';

function urlBase64ToUint8Array(base64String) {
    const padding =
        '='.repeat(
            (4 - (base64String.length % 4)) % 4
        );

    const base64 =
        (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

    const rawData = window.atob(base64);

    const outputArray =
        new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] =
            rawData.charCodeAt(i);
    }

    return outputArray;
}

export async function registerPushNotifications() {
    if (!('serviceWorker' in navigator)) {
        throw new Error(
            'Service workers are not supported.'
        );
    }

    if (!('PushManager' in window)) {
        throw new Error(
            'Push notifications are not supported.'
        );
    }

    if (!('Notification' in window)) {
        throw new Error(
            'Browser notifications are not supported.'
        );
    }

    const permission =
        await Notification.requestPermission();

    if (permission !== 'granted') {
        throw new Error(
            'Notification permission was not granted.'
        );
    }

    const registration =
        await navigator.serviceWorker.register(
            '/sw.js'
        );

    await navigator.serviceWorker.ready;

    const response =
        await api.getNotificationPublicKey();

    const publicKey =
        response.publicKey;

    if (!publicKey) {
        throw new Error(
            'VAPID public key is missing.'
        );
    }

    const applicationServerKey =
        urlBase64ToUint8Array(publicKey);

    let subscription =
        await registration.pushManager.getSubscription();

    if (subscription) {
    }

    if (!subscription) {
        subscription =
            await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });
    }

    await api.subscribeNotifications(
        subscription.toJSON()
    );

    return subscription;
}
