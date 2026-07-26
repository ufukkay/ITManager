module.exports = {
    ...require('./crud.controller'),
    ...require('./checkout.controller'),
    ...require('./history.controller'),
    ...require('./analytics.controller'),
    ...require('./personnel-assets.controller'),
    ...require('./metadata.controller'),
    ...require('./label-templates.controller'),
    ...require('./form-templates.controller'),
    ...require('./audit.controller'),
};
