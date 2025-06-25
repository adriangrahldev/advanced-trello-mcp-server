"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrelloColorWithNullEnum = exports.TrelloColorEnum = void 0;
const zod_1 = require("zod");
// Trello color enum for labels and other colored elements
exports.TrelloColorEnum = zod_1.z.enum([
    'yellow',
    'purple',
    'blue',
    'red',
    'green',
    'orange',
    'black',
    'sky',
    'pink',
    'lime',
]);
// Trello color enum with null option
exports.TrelloColorWithNullEnum = zod_1.z.enum([
    'yellow',
    'purple',
    'blue',
    'red',
    'green',
    'orange',
    'black',
    'sky',
    'pink',
    'lime',
    'null'
]);
