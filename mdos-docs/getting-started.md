# Getting started

## Anatomy of a mdos application

### Applications & application components

Applications are to be seen as a higher level concept that is composed of one or more application components. Application components are your actual projects, where one component would be your API backend server, another might be a database server and a third one your front end application for instance.

![CLI](img/anatomy.png)

This architecture allows you to compose quite complex applications to suit most needs.

### Project layout

A MDos application project layout is composed of one or more folders, each one representing an application component.  
At the root of the application folder is a `mdos.yaml` file that holds all runtime configuration parameters for the application and it's components:

```title="Project structure"
my-application/
├── backend
│   └── Dockerfile
├── frontend
│   └── Dockerfile
├── volumes
└── mdos.yaml
```

In this example we have an application named `my-application`, that is composed of two distinct application components: `backend` & `frontend`.  
Each component has it's own Dockerfile.  
At the `application` level, there is also a `volumes` folder where you can store application component volume files to be used within your application, and a `mdos.yaml` config file that holds all runtime configuration parameters.  
We will have a look at a sample `mdos.yaml` file in our example below. But first, we need to create a new Namespace for our application.

## Create a tenant namespace

## Scaffold an application & application components

### Create a new application

Let's create a new application project using the `mdos` CLI command:

```sh
mdos generate application
```

```yaml linenums="1"
Under construction
```

This will create a new folder with the `mdos.yaml` configuration file in it. We are now ready to create application components.

### Create a new application component

Inside your application project folder, run the following command:

```sh
mdos generate component
```

The CLI will ask you a couple of things about some base configuration parameters.
This will create a new component folder with an empty `Dockerfile` for you to use, as well as update the `mdos.yaml` file referencing the component as part of the overall application project along with it's configuration parameters.  
You can no go ahead and build & test your application locally, and complete the `Dockerfile` that will be used to build your component application image for deployment onto the cluster.

## Deploy your application