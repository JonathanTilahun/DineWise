    FROM public.ecr.aws/lambda/nodejs:16

    COPY . /var/task

    RUN npm install

    CMD ["lambda.handler"]
