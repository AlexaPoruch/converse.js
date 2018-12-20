// Converse.js
// http://conversejs.org
//
// Copyright (c) 2018, the Converse.js developers
// Licensed under the Mozilla Public License (MPLv2)

import "./converse-disco";
import converse from "./converse-core";

const { Strophe, Backbone, Promise, $iq, $build, $msg, $pres, b64_sha1, f, moment, _ } = converse.env;

Strophe.addNamespace('PUBSUB_ERROR', Strophe.NS.PUBSUB+"#errors");


converse.plugins.add('converse-pubsub', {

    dependencies: ["converse-disco"],

    initialize () {
        /* The initialize function gets called as soon as the plugin is
         * loaded by converse.js's plugin machinery.
         */
        const { _converse } = this,
              { __ } = _converse;


        /************************ BEGIN API ************************/
        // We extend the default converse.js API to add methods specific to MUC groupchats.
        _.extend(_converse.api, {
            /**
             * The "pubsub" namespace groups methods relevant to PubSub
             *
             * @namespace _converse.api.pubsub
             * @memberOf _converse.api
             */
            'pubsub': {
                /**
                 * Publshes an item to a PubSub node
                 *
                 * @method _converse.api.pubsub.publish
                 * @param {string} jid The JID of the pubsub service where the node resides.
                 * @param {string} node The node being published to
                 * @param {Strophe.Builder} item The Strophe.Builder representation of the XML element being published
                 * @param {object} options An object representing the publisher options
                 *                         (see https://xmpp.org/extensions/xep-0060.html#publisher-publish-options)
                 */
                async 'publish' (jid, node, item, options) {
                    const stanza = $iq({
                        'from': _converse.bare_jid,
                        'type': 'set',
                        'to': jid
                    }).c('pubsub', {'xmlns': Strophe.NS.PUBSUB})
                        .c('publish', {'node': node})
                            .cnode(item.tree()).up().up();

                    if (options) {
                        jid = jid || _converse.bare_jid;
                        const result = await _converse.api.disco.supports(Strophe.NS.PUBSUB + '#publish-options', jid);
                        if (result.length) {
                            stanza.c('publish-options')
                                .c('x', {'xmlns': Strophe.NS.XFORM, 'type': 'submit'})
                                    .c('field', {'var': 'FORM_TYPE', 'type': 'hidden'})
                                        .c('value').t('http://jabber.org/protocol/pubsub#publish-options').up().up()

                            Object.keys(options).forEach(k => stanza.c('field', {'var': k}).c('value').t(options[k]).up().up());
                        } else {
                            _converse.log(`_converse.api.publish: ${jid} does not support #publish-options, `+
                                          `so we didn't set them even though they were provided.`)
                        }
                    }
                    return _converse.api.sendIQ(stanza);
                }
            }
        });
        /************************ END API ************************/
    }
});