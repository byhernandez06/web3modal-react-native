import { useEffect } from 'react';
import { StyleSheet, Alert, SafeAreaView, View } from 'react-native';
import Modal from 'react-native-modal';
import { useSnapshot } from 'valtio';
import type { SessionTypes } from '@walletconnect/types';

import Web3ModalHeader from './Web3ModalHeader';
import { ModalCtrl } from '../controllers/ModalCtrl';
import { Web3ModalRouter } from './Web3ModalRouter';
import { AccountCtrl } from '../controllers/AccountCtrl';
import { ClientCtrl } from '../controllers/ClientCtrl';
import { ToastCtrl } from '../controllers/ToastCtrl';
import { useOrientation } from '../hooks/useOrientation';
import type { IProviderMetadata, ISessionParams } from '../types/coreTypes';
import { useConfigure } from '../hooks/useConfigure';
import { defaultSessionParams } from '../constants/Config';
import { ConfigCtrl } from '../controllers/ConfigCtrl';
import { setDeepLinkWallet } from '../utils/StorageUtil';
import useTheme from '../hooks/useTheme';
import ModalToast from './ModalToast';

interface Web3ModalProps {
  projectId: string;
  providerMetadata: IProviderMetadata;
  sessionParams?: ISessionParams;
  relayUrl?: string;
  onCopyClipboard?: (value: string) => void;
  themeMode?: 'dark' | 'light';
  apiVersion?: number;
}

export function Web3Modal({
  projectId,
  providerMetadata,
  sessionParams = defaultSessionParams,
  relayUrl,
  onCopyClipboard,
  themeMode,
  apiVersion,
}: Web3ModalProps) {
  useConfigure({ projectId, providerMetadata, relayUrl, themeMode, apiVersion });
  const { open } = useSnapshot(ModalCtrl.state);
  const { isConnected } = useSnapshot(AccountCtrl.state);
  const { width } = useOrientation();
  const Theme = useTheme();

  const onSessionCreated = async (session: SessionTypes.Struct) => {
    ClientCtrl.setSessionTopic(session.topic);
    const deepLink = ConfigCtrl.getRecentWalletDeepLink();
    try {
      if (deepLink) {
        await setDeepLinkWallet(deepLink);
        ConfigCtrl.setRecentWalletDeepLink(undefined);
      }
      AccountCtrl.getAccount();
      ModalCtrl.close();
    } catch (error) {
      ToastCtrl.openToast("Couldn't save deeplink", 'error');
    }
  };

  const onSessionError = async () => {
    ConfigCtrl.setRecentWalletDeepLink(undefined);
    ModalCtrl.close();
    ToastCtrl.openToast('Unable to create the session', 'error');
  };

  const onConnect = async () => {
    const provider = ClientCtrl.provider();
    try {
      if (!provider) throw new Error('Provider not initialized');

      if (!isConnected) {
        const session = await provider.connect(sessionParams);
        if (session) {
          onSessionCreated(session);
        }
      }
    } catch (error) {
      onSessionError();
    }
  };

  useEffect(() => {
    if (!projectId) {
      Alert.alert('Error', 'projectId not found');
    }
  }, [projectId]);

  return (
    <Modal
      isVisible={open}
      style={styles.modal}
      propagateSwipe
      hideModalContentWhileAnimating
      onBackdropPress={ModalCtrl.close}
      onModalWillShow={onConnect}
      useNativeDriver
      statusBarTranslucent
    >
      <View
        style={[styles.container, { width, backgroundColor: Theme.accent }]}
      >
        <Web3ModalHeader onClose={ModalCtrl.close} />
        <SafeAreaView
          style={[
            styles.connectWalletContainer,
            { backgroundColor: Theme.background1 },
          ]}
        >
          <Web3ModalRouter onCopyClipboard={onCopyClipboard} />
          <ModalToast />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  connectWalletContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
});
