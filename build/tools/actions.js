"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerActionsTools = registerActionsTools;
const zod_1 = require("zod");
/**
 * Register all Actions API tools
 * Based on https://developer.atlassian.com/cloud/trello/rest/api-group-actions/
 */
function registerActionsTools(server, credentials) {
    // GET /actions/{id} - Get an Action
    server.tool('get-action', {
        actionId: zod_1.z.string().describe('ID of the action to retrieve'),
        display: zod_1.z.boolean().optional().describe('Include display information'),
        entities: zod_1.z.boolean().optional().describe('Include entity information'),
        fields: zod_1.z.string().optional().describe('Comma-separated list of fields to include'),
        member: zod_1.z.boolean().optional().describe('Include member information'),
        memberCreator: zod_1.z.boolean().optional().describe('Include member creator information'),
        memberCreatorFields: zod_1.z.string().optional().describe('Comma-separated list of member creator fields'),
        memberFields: zod_1.z.string().optional().describe('Comma-separated list of member fields'),
    }, async ({ actionId, display, entities, fields, member, memberCreator, memberCreatorFields, memberFields }) => {
        try {
            if (!credentials.apiKey || !credentials.apiToken) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Trello API credentials are not configured',
                        },
                    ],
                    isError: true,
                };
            }
            const url = new URL(`https://api.trello.com/1/actions/${actionId}`);
            url.searchParams.append('key', credentials.apiKey);
            url.searchParams.append('token', credentials.apiToken);
            if (display !== undefined)
                url.searchParams.append('display', display.toString());
            if (entities !== undefined)
                url.searchParams.append('entities', entities.toString());
            if (fields)
                url.searchParams.append('fields', fields);
            if (member !== undefined)
                url.searchParams.append('member', member.toString());
            if (memberCreator !== undefined)
                url.searchParams.append('memberCreator', memberCreator.toString());
            if (memberCreatorFields)
                url.searchParams.append('memberCreator_fields', memberCreatorFields);
            if (memberFields)
                url.searchParams.append('member_fields', memberFields);
            const response = await fetch(url.toString());
            const data = await response.json();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(data),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error getting action: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // PUT /actions/{id} - Update an Action (comment actions only)
    server.tool('update-action', {
        actionId: zod_1.z.string().describe('ID of the action to update'),
        text: zod_1.z.string().describe('New text content for the comment action'),
    }, async ({ actionId, text }) => {
        try {
            if (!credentials.apiKey || !credentials.apiToken) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Trello API credentials are not configured',
                        },
                    ],
                    isError: true,
                };
            }
            const response = await fetch(`https://api.trello.com/1/actions/${actionId}?key=${credentials.apiKey}&token=${credentials.apiToken}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                }),
            });
            const data = await response.json();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(data),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error updating action: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // DELETE /actions/{id} - Delete an Action (comment actions only)
    server.tool('delete-action', {
        actionId: zod_1.z.string().describe('ID of the action to delete'),
    }, async ({ actionId }) => {
        try {
            if (!credentials.apiKey || !credentials.apiToken) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Trello API credentials are not configured',
                        },
                    ],
                    isError: true,
                };
            }
            const response = await fetch(`https://api.trello.com/1/actions/${actionId}?key=${credentials.apiKey}&token=${credentials.apiToken}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(data),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error deleting action: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // GET /actions/{id}/reactions - Get reactions for an Action
    server.tool('get-action-reactions', {
        actionId: zod_1.z.string().describe('ID of the action'),
        member: zod_1.z.boolean().optional().describe('Include member information for reactions'),
        emoji: zod_1.z.boolean().optional().describe('Include emoji information for reactions'),
    }, async ({ actionId, member, emoji }) => {
        try {
            if (!credentials.apiKey || !credentials.apiToken) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Trello API credentials are not configured',
                        },
                    ],
                    isError: true,
                };
            }
            const url = new URL(`https://api.trello.com/1/actions/${actionId}/reactions`);
            url.searchParams.append('key', credentials.apiKey);
            url.searchParams.append('token', credentials.apiToken);
            if (member !== undefined)
                url.searchParams.append('member', member.toString());
            if (emoji !== undefined)
                url.searchParams.append('emoji', emoji.toString());
            const response = await fetch(url.toString());
            const data = await response.json();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(data),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error getting action reactions: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // TODO: Add remaining Actions API tools
    // - get-action-field
    // - get-action-board
    // - get-action-card
    // - get-action-list
    // - get-action-member
    // - get-action-member-creator
    // - get-action-organization
    // - update-comment-action
    // - create-action-reaction
    // - get-action-reaction
    // - delete-action-reaction
    // - get-action-reactions-summary
}
