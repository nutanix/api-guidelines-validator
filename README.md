# API Validation Tool

A node based API interceptor that can be used to validate API specification for an existing API. This interceptor should be deployed as proxy to the target API.

---
## Pre-requisites

For development, you will only need Node.js and a node global package or Yarn, installed in your environment.

### Node
- #### Node installation on Windows

  Visit [official Node.js website](https://nodejs.org/) and download the installer.
Also, be sure to have `git` available in your PATH, `npm` might need it (You can find git [here](https://git-scm.com/)).

- #### Node installation on Ubuntu

  You can install nodejs and npm easily with apt install, by running the following commands.

      $ sudo apt install nodejs
      $ sudo apt install npm

- #### Other Operating Systems
  You can find more information about the installation on the [official Node.js website](https://nodejs.org/) and the [official NPM website](https://npmjs.org/).

If the installation was successful, you should be able to run the following command.

    $ node --version
    v10.15.2

    $ npm --version
    6.4.1

If you need to update `npm`, you can update it using `npm`! After running the following command, just open again the command line and execute following command.

    $ npm install npm -g


---

## Clone and setup

    $ git clone https://github.com/nutanix/api-guidelines-validator.git
    $ cd api-guidelines-validator
    $ npm install

## Configure app locally

Create `.env` then add below environment variables:

- `PORT` service port number;
- `NODE_ENV` should be either `production` or `development`;
- `TARGET` base URL of target API;
- `DOC_TARGET` relative URL to openapi or swagger doc `.yaml`.

## Running the project

    $ npm start


## References

To understand more information about the project working principles, please refer to https://medium.com/@santanu_kumar/a-way-to-validate-and-enforce-guidelines-for-an-api-design-3517d88b7079