/**
 * SwitchOn React hooks
 *
 * Wraps SwitchOnClient so flag values automatically re-render your components.
 *
 * Quick start:
 *   import { SwitchOnProvider, useFlag, useVariation } from '@switchon/js-sdk/react';
 *   import SwitchOnClient from '@switchon/js-sdk';
 *
 *   // 1. Create the client (outside the component tree)
 *   const flagClient = new SwitchOnClient({
 *     apiUrl:      'https://flags.yourapp.com',
 *     sdkKey:      'sdk-prod-xxxxxxxxxxxxxxxx',
 *     environment: 'production',
 *   });
 *
 *   // 2. Wrap your app
 *   function App() {
 *     return (
 *       <SwitchOnProvider client={flagClient} userId="user-123" userAttributes={{ plan: 'pro' }}>
 *         <YourApp />
 *       </SwitchOnProvider>
 *     );
 *   }
 *
 *   // 3. Use flags anywhere
 *   function Checkout() {
 *     const showNewCheckout = useFlag('new-checkout', false);
 *     const ctaText         = useVariation('cta-text', 'Buy Now');
 *     return showNewCheckout ? <NewCheckout cta={ctaText} /> : <OldCheckout />;
 *   }
 */

'use strict';

var React = require('react');

var createContext   = React.createContext;
var useState        = React.useState;
var useEffect       = React.useEffect;
var useContext      = React.useContext;
var useCallback     = React.useCallback;
var createElement   = React.createElement;

// ── Context ───────────────────────────────────────────────────────────────────
var SwitchOnContext = createContext(null);

// ── SwitchOnProvider ──────────────────────────────────────────────────────────
/**
 * Place this near the root of your app. It initialises the SDK client, keeps
 * the flags state in sync, and passes the client + flags down via context.
 *
 * Props:
 *   client         {SwitchOnClient}  — The SDK client instance.
 *   userId         {string}          — Stable ID for the current user.
 *   userAttributes {object}          — Optional targeting attributes.
 *   children       {ReactNode}
 *   loadingFallback{ReactNode}       — Rendered while flags are loading (optional).
 */
function SwitchOnProvider(props) {
  var client          = props.client;
  var userId          = props.userId;
  var userAttributes  = props.userAttributes;
  var children        = props.children;
  var loadingFallback = props.loadingFallback || null;

  var _state = useState({ flags: {}, ready: false });
  var state  = _state[0];
  var setState = _state[1];

  useEffect(function () {
    if (!client) return;

    // Listen for any flag value change and force a re-render
    function onReady(evaluated) {
      setState({ flags: Object.assign({}, evaluated), ready: true });
    }

    function onChange() {
      setState(function (prev) {
        return { flags: Object.assign({}, client.allFlags()), ready: prev.ready };
      });
    }

    client.on('ready',    onReady);
    client.on('snapshot', onReady);
    client.on('change',   onChange);

    // If not yet initialised, kick it off
    if (!client._ready) {
      client.init(userId || 'anonymous', userAttributes || {});
    } else {
      // Already ready (e.g. hot reload) — sync immediately
      setState({ flags: client.allFlags(), ready: true });
    }

    return function () {
      client.off('ready',    onReady);
      client.off('snapshot', onReady);
      client.off('change',   onChange);
    };
  }, [client, userId]); // re-init when userId changes (acts as identify())

  if (!state.ready && loadingFallback) {
    return loadingFallback;
  }

  return createElement(
    SwitchOnContext.Provider,
    { value: { client: client, flags: state.flags, ready: state.ready } },
    children
  );
}

// ── useSwitchOn() ─────────────────────────────────────────────────────────────
// Returns the raw context: { client, flags, ready }
function useSwitchOn() {
  var ctx = useContext(SwitchOnContext);
  if (!ctx) throw new Error('[SwitchOn] useSwitchOn must be used inside <SwitchOnProvider>');
  return ctx;
}

// ── useFlag(flagName, defaultValue) ──────────────────────────────────────────
// Returns the current boolean or variation value for flagName.
// Re-renders the component whenever the flag changes.
function useFlag(flagName, defaultValue) {
  if (defaultValue === undefined) defaultValue = false;
  var ctx = useContext(SwitchOnContext);
  if (!ctx) {
    console.warn('[SwitchOn] useFlag must be used inside <SwitchOnProvider>');
    return defaultValue;
  }
  return (flagName in ctx.flags) ? ctx.flags[flagName] : defaultValue;
}

// ── useVariation(flagName, defaultValue) ─────────────────────────────────────
// Alias for useFlag — more semantic name for multivariate flags.
function useVariation(flagName, defaultValue) {
  return useFlag(flagName, defaultValue);
}

// ── useFlags() ────────────────────────────────────────────────────────────────
// Returns the entire evaluated-flags map as a plain object.
function useFlags() {
  var ctx = useContext(SwitchOnContext);
  if (!ctx) {
    console.warn('[SwitchOn] useFlags must be used inside <SwitchOnProvider>');
    return {};
  }
  return ctx.flags;
}

// ── useIsReady() ──────────────────────────────────────────────────────────────
// Returns true once the initial flag load completes.
function useIsReady() {
  var ctx = useContext(SwitchOnContext);
  return ctx ? ctx.ready : false;
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  SwitchOnProvider: SwitchOnProvider,
  useSwitchOn:      useSwitchOn,
  useFlag:          useFlag,
  useVariation:     useVariation,
  useFlags:         useFlags,
  useIsReady:       useIsReady,
};
